"use client";

import ClassDetailLoading from "./loading";
import { WeekSlotListSkeleton } from "@/components/calendar/ClassListSkeleton";
import { formatClassName, sameClassWords } from "@/shared/utils/className";
import { hasTopic, isVisibleSlot } from "@/shared/utils/lessonTopic";
import { Badge } from "@/components/ui/badge";
import { PlanGenerationBanner } from "@/components/plan-generation/PlanGenerationBanner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { selectIsClassStateEnabled, selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { FeatureUnavailable } from "@/components/feature/FeatureUnavailable";
import {
  fetchTimetable,
  fetchLessons,
  setSlotCheckIn,
  setSlotStatus,
  updateLesson,
} from "@/store/timetable/timetableSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { isUpgradeReason } from "@/shared/types/plan-limits";
import type { RootState } from "@/store/store";
import { Routes } from "@/shared/types";
import {
  generateLesson as generateLessonStream,
  regenerateLesson as regenerateLessonStream,
  generateWeek as generateWeekStream,
  type LessonSlot,
  type LessonSlotType,
} from "@/services/api/timetable.service";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Loader2,
  Sparkles,
} from "lucide-react";

import { SLOT_STATUS_CONFIG } from "@/shared/constants/lessonSlotStatus";
import { translateSubject } from "@/components/document-creation/constants";
import { SlotDialog } from "@/components/calendar/SlotDialog";
import { TeachingMarkBadge, TeachingMarkLegend } from "@/components/calendar/TeachingMarkBadge";
import { NextStepsCard } from "@/components/next-steps/NextStepsCard";
import { ReviewFeedSection } from "@/components/review-feed/ReviewFeedSection";
import { ReplanRequestDialog } from "@/components/replan/ReplanRequestDialog";
import { useReplan } from "@/hooks/useReplan";
import { TurmaProgressPanel } from "@/components/calendar/TurmaProgressPanel";
import type { SlotWithTimetable } from "@/shared/types/calendar";
import type { CheckInRecord } from "@/shared/types/check-in";
import { teachingMark, type SlotCheckInAnswer } from "@/shared/utils/teachingStatus";
import { toIso, defaultCalendarWeek, getWeekStart, addDays, formatWeekLabel, toIntlLocale } from "@/shared/utils/calendar";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectPlanGeneration } from "@/store/planGeneration/selectors";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useLocale, useTranslations } from "next-intl";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import { slotStatusKey } from "@/shared/utils/week";

// ─────────────────────── Types / helpers ─────────────────────────────────────

type WeekMap = Map<string, LessonSlot[]>;

const STATUS_CONFIG = SLOT_STATUS_CONFIG;

// ─────────────────────── Slot card (list-view) ───────────────────────────────

interface SlotCardProps {
  slot: LessonSlot;
  color: string;
  onOpen: (slot: LessonSlot) => void;
}

function SlotCard({ slot, color, onOpen }: SlotCardProps) {
  const t = useTranslations("calendar");
  const tTimetable = useTranslations("timetable");
  const tReview = useTranslations("reviewFeed");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const isHoliday = slot.slotType === "HOLIDAY";
  const isFailed = slot.status === "failed";
  const cfg = STATUS_CONFIG[slot.status];
  const checkInEnabled = useAppSelector(selectIsClassStateEnabled);
  // Only with class_state_enabled: with the flag off the card looks as it always did.
  const mark = checkInEnabled ? teachingMark(slot, toIso(new Date())) : null;
  const borderColor = isFailed ? "#ef4444" : color;
  const rgb = color.replace("#", "").match(/.{2}/g);
  const tintBg = rgb
    ? `rgba(${parseInt(rgb[0], 16)},${parseInt(rgb[1], 16)},${parseInt(rgb[2], 16)},0.06)`
    : undefined;

  return (
    <button
      type="button"
      onClick={() => !isHoliday && onOpen(slot)}
      disabled={isHoliday}
      className={`w-full text-left rounded-lg border transition ${
        isHoliday
          ? "cursor-default opacity-50"
          : "cursor-pointer hover:shadow-sm hover:border-primary/40"
      } ${isFailed ? "bg-red-50 dark:bg-red-950/20" : ""} ${mark?.key === "notHeld" ? "opacity-60" : ""}`}
      style={{
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: !isFailed && !isHoliday ? tintBg : undefined,
      }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <span className="w-7 shrink-0 text-right text-xs font-mono text-muted-foreground">
          {slot.sequenceNumber}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${isHoliday ? "line-through text-muted-foreground" : ""}`}>
            {isHoliday ? t("shared.holidayNoLesson") : hasTopic(slot) ? slot.topicTitle : t("shared.notHeldTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(`${slot.slotDate}T00:00:00`).toLocaleDateString(toIntlLocale(locale), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {" · "}{t("shared.minutesSuffix", { count: slot.durationMinutes })}
          </p>
          {isFailed && (
            <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-0.5">
              <AlertTriangle className="h-3 w-3" />
              {t("detail.generationFailed")}
            </p>
          )}
        </div>
        {/* ENG-247: a regeneration proposed a new topic for this prepared lesson; the dialog shows it. */}
        {slot.pendingProposal && (
          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            {tReview("topicBadge")}
          </span>
        )}
        {mark && <TeachingMarkBadge mark={mark} className="text-sm" />}
        {!isHoliday && (
          <Badge className={`shrink-0 gap-1 border text-xs ${cfg.badgeCls}`}>
            {cfg.icon}
            {tTimetable(`status.${slotStatusKey(slot.status, slot.slotDate)}`)}
          </Badge>
        )}
      </div>
    </button>
  );
}

// ─────────────────────── Main page ───────────────────────────────────────────

export default function CalendarViewPage() {
  const t = useTranslations("calendar");
  const tTimetable = useTranslations("timetable");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const params = useParams();
  const id = params.id as string;
  const { loaded: featuresLoaded, enabled } = useFeatureAccess(selectIsHorarioPlanosEnabled);
  const { currentTimetable, slots, isSlotsLoading, isLoading, error } =
    useSelector((state: RootState) => state.timetable);
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();

  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const [weekStart, setWeekStart] = useState<Date>(() => {
    // The weekly email links here with ?week=YYYY-MM-DD.
    if (weekParam) {
      const d = new Date(`${weekParam}T00:00:00`);
      if (!isNaN(d.getTime())) return getWeekStart(d);
    }
    return defaultCalendarWeek();
  });

  // Follow the ?week param when it changes (client-side navigation to the same page).
  useEffect(() => {
    if (!weekParam) return;
    const d = new Date(`${weekParam}T00:00:00`);
    if (!isNaN(d.getTime())) setWeekStart(getWeekStart(d));
  }, [weekParam]);
  const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
  // ?lesson=<id> (the "Abrir" of a reinforcement worksheet) opens that lesson once its week has loaded, once.
  const lessonParam = searchParams.get("lesson");
  const openedLessonRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lessonParam || openedLessonRef.current === lessonParam) return;
    const found = slots.find((s) => s.id === lessonParam);
    if (!found) return;
    openedLessonRef.current = lessonParam;
    setSelectedSlot(found);
  }, [lessonParam, slots]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const streamRef = useRef("");

  useEffect(() => {
    if (!enabled) return; // gated users get the FeatureUnavailable screen below
    dispatch(fetchTimetable(id));
    dispatch(fetchLessons({ timetableId: id }));
  }, [enabled, id, dispatch]);

  // Background plan generation (started in onboarding): reload this class's lessons
  // whenever it produces new topics or finishes a lesson.
  const planGenRefreshKey = useSelector(selectPlanGeneration).refreshKey;
  const lastPlanGenKeyRef = useRef(planGenRefreshKey);
  useEffect(() => {
    if (planGenRefreshKey === lastPlanGenKeyRef.current) return;
    lastPlanGenKeyRef.current = planGenRefreshKey;
    if (!enabled) return;
    dispatch(fetchLessons({ timetableId: id }));
  }, [planGenRefreshKey, enabled, id, dispatch]);

  // Safety net: creation now waits for the topics before opening this page (see
  // useCreateClassWithTopics), but a teacher can carry on after a failed
  // generation, or open a class whose topics are still being written. Polls
  // while titles are missing; stops once every eligible slot has a title, or
  // after a bounded number of attempts so a genuinely stuck/failed generation
  // doesn't poll forever.
  const pendingTopics = useMemo(
    () => slots.some((s) => s.slotType !== "HOLIDAY" && !s.topicTitle),
    [slots]
  );
  const pollAttemptsRef = useRef(0);
  useEffect(() => {
    if (!enabled || isSlotsLoading || !pendingTopics) {
      pollAttemptsRef.current = 0;
      return;
    }
    const MAX_ATTEMPTS = 15;
    const interval = setInterval(() => {
      pollAttemptsRef.current += 1;
      dispatch(fetchLessons({ timetableId: id }));
      if (pollAttemptsRef.current >= MAX_ATTEMPTS) clearInterval(interval);
    }, 4000);
    return () => clearInterval(interval);
  }, [enabled, isSlotsLoading, pendingTopics, id, dispatch]);

  // Keep selectedSlot in sync with store (status updates from SSE)
  useEffect(() => {
    if (!selectedSlot) return;
    const updated = slots.find((s) => s.id === selectedSlot.id);
    if (updated) setSelectedSlot(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  // Group slots by ISO week start
  const slotsByWeek: WeekMap = useMemo(() => {
    const map: WeekMap = new Map();
    for (const slot of slots) {
      if (!isVisibleSlot(slot)) continue; // lessons without a topic are never shown, except a not-held one
      const d = new Date(`${slot.slotDate}T00:00:00`);
      const ws = toIso(getWeekStart(d));
      if (!map.has(ws)) map.set(ws, []);
      const weekSlots = map.get(ws);
      if (weekSlots) weekSlots.push(slot);
    }
    return map;
  }, [slots]);

  const currentWeekIso = toIso(weekStart);
  const currentWeekSlots = useMemo(
    () =>
      (slotsByWeek.get(currentWeekIso) ?? []).sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber
      ),
    [slotsByWeek, currentWeekIso]
  );

  const prevWeek = () =>
    setWeekStart((p) => addDays(p, -7));
  const nextWeek = () =>
    setWeekStart((p) => addDays(p, 7));

  // A check-in saved from the slot dialog: the card's mark follows without reloading the lessons,
  // and the turma progress panel reloads its figures.
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const { isPro } = useReplan();
  const tReplan = useTranslations("replan");
  const replanEnabled = useAppSelector(selectIsClassStateEnabled);
  const [replanOpen, setReplanOpen] = useState(false);
  const handleCheckedIn = useCallback(
    (target: SlotWithTimetable, record: CheckInRecord, answer: SlotCheckInAnswer) => {
      dispatch(
        setSlotCheckIn({
          slotId: target.id,
          teachingStatus: record.teachingStatus,
          checkedInAt: record.checkedInAt,
          checkInResult: answer.checkInResult,
          checkInOutcomeIds: answer.checkInOutcomeIds,
          missingAmount: answer.missingAmount,
          teachingNote: answer.teachingNote,
        })
      );
      setProgressRefreshKey((key) => key + 1);
    },
    [dispatch]
  );

  // A check-in saved on the previous lesson (asked at the top of the dialog), a reinforcement worksheet or
  // carry-over started after a check-in, or the following lessons moved after "não houve aula": the progress
  // panel, the next steps and the lessons reload from the server.
  const reloadClassState = useCallback(() => {
    setProgressRefreshKey((key) => key + 1);
    dispatch(fetchLessons({ timetableId: id }));
  }, [dispatch, id]);

  // "Por rever": a topic proposal opens its lesson in the dialog, where the proposal is.
  const openLessonById = useCallback(
    (slotId: string) => {
      const found = slots.find((s) => s.id === slotId);
      if (found) setSelectedSlot(found);
    },
    [slots]
  );

  // Wrap the selected slot with the current timetable for the shared SlotDialog
  const selectedSlotWithTimetable = useMemo<SlotWithTimetable | null>(() => {
    if (!selectedSlot || !currentTimetable) return null;
    return { ...selectedSlot, timetable: currentTimetable };
  }, [selectedSlot, currentTimetable]);

  // Class State analytics: a lesson slot got (or failed to get) its material.
  const trackLessonMaterial = useCallback(
    (
      mode: "generate" | "regenerate",
      slot: LessonSlot,
      withInstructions: boolean,
      outcome: "completed" | "failed"
    ) => {
      posthog.capture("class_lesson_material_generated", {
        timetable_id: id,
        lesson_id: slot.id,
        slot_type: slot.slotType,
        mode,
        with_instructions: withInstructions,
        outcome,
        subject: currentTimetable?.subject ?? null,
        grade_level: currentTimetable?.gradeLevel ?? null,
      });
    },
    [id, currentTimetable?.subject, currentTimetable?.gradeLevel]
  );

  const handleGenerateLesson = useCallback(
    async (slotOrWrapped: SlotWithTimetable | LessonSlot, message?: string) => {
      const slot = slotOrWrapped as LessonSlot;
      const previousStatus = slot.status;
      setSelectedSlot(null);
      setIsGenerating(true);
      streamRef.current = "";
      setStreamContent("");
      dispatch(setSlotStatus({ slotId: slot.id, status: "generating" }));

      try {
        await generateLessonStream(
          id,
          slot.id,
          message,
          {
            onChunk: (c) => {
              streamRef.current += c;
              setStreamContent(streamRef.current);
            },
            onDone: () => {
              trackLessonMaterial("generate", slot, Boolean(message), "completed");
              dispatch(setSlotStatus({ slotId: slot.id, status: "completed" }));
              dispatch(fetchLessons({ timetableId: id }));
              setSelectedSlot(null);
            },
            onError: () => {
              trackLessonMaterial("generate", slot, Boolean(message), "failed");
              dispatch(setSlotStatus({ slotId: slot.id, status: "failed" }));
            },
            onFreeLimit: (code) => {
              dispatch(setSlotStatus({ slotId: slot.id, status: previousStatus }));
              if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
            },
            onQuotaExceeded: () => {
              dispatch(setSlotStatus({ slotId: slot.id, status: previousStatus }));
              dispatch(setUpgradeModalOpen(true));
            },
          },
          getToken
        );
      } finally {
        setIsGenerating(false);
        setStreamContent("");
        streamRef.current = "";
      }
    },
    [id, dispatch, getToken, trackLessonMaterial]
  );

  const handleRegenerateLesson = useCallback(
    async (slotOrWrapped: SlotWithTimetable | LessonSlot, message?: string) => {
      const slot = slotOrWrapped as LessonSlot;
      const previousStatus = slot.status;
      setSelectedSlot(null);
      setIsGenerating(true);
      streamRef.current = "";
      setStreamContent("");
      dispatch(setSlotStatus({ slotId: slot.id, status: "generating" }));

      try {
        await regenerateLessonStream(
          id,
          slot.id,
          message,
          {
            onChunk: (c) => {
              streamRef.current += c;
              setStreamContent(streamRef.current);
            },
            onDone: () => {
              trackLessonMaterial("regenerate", slot, Boolean(message), "completed");
              dispatch(setSlotStatus({ slotId: slot.id, status: "completed" }));
              dispatch(fetchLessons({ timetableId: id }));
              setSelectedSlot(null);
            },
            onError: () => {
              trackLessonMaterial("regenerate", slot, Boolean(message), "failed");
              dispatch(setSlotStatus({ slotId: slot.id, status: "failed" }));
            },
            onFreeLimit: (code) => {
              dispatch(setSlotStatus({ slotId: slot.id, status: previousStatus }));
              if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
            },
            onQuotaExceeded: () => {
              dispatch(setSlotStatus({ slotId: slot.id, status: previousStatus }));
              dispatch(setUpgradeModalOpen(true));
            },
          },
          getToken
        );
      } finally {
        setIsGenerating(false);
        setStreamContent("");
        streamRef.current = "";
      }
    },
    [id, dispatch, getToken, trackLessonMaterial]
  );

  const handleGenerateWeek = useCallback(async () => {
    setGeneratingWeek(true);
    let slotsCompleted = 0;
    let slotsFailed = 0;
    // Slots shown as "generating" that a plan limit may leave stuck: back to pending.
    const inFlight = new Set<string>();
    const resetInFlight = () => {
      inFlight.forEach((slotId) =>
        dispatch(setSlotStatus({ slotId, status: "pending" })),
      );
      inFlight.clear();
    };
    try {
      await generateWeekStream(
        id,
        currentWeekIso,
        {
          onSlotStart: (slotId) => {
            inFlight.add(slotId);
            dispatch(setSlotStatus({ slotId, status: "generating" }));
          },
          onSlotDone: (slotId) => {
            slotsCompleted += 1;
            inFlight.delete(slotId);
            dispatch(setSlotStatus({ slotId, status: "completed" }));
          },
          onSlotError: (slotId) => {
            slotsFailed += 1;
            inFlight.delete(slotId);
            dispatch(setSlotStatus({ slotId, status: "failed" }));
          },
          onFreeLimit: (code) => {
            resetInFlight();
            if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
          },
          onQuotaExceeded: () => {
            resetInFlight();
            dispatch(setUpgradeModalOpen(true));
          },
          onDone: () => dispatch(fetchLessons({ timetableId: id })),
        },
        getToken
      );
    } finally {
      setGeneratingWeek(false);
      // "Gerar semana": the clearest signal that a teacher is planning a real week in Scooli.
      posthog.capture("class_week_generated", {
        timetable_id: id,
        week_start: currentWeekIso,
        slots_completed: slotsCompleted,
        slots_failed: slotsFailed,
        subject: currentTimetable?.subject ?? null,
        grade_level: currentTimetable?.gradeLevel ?? null,
      });
    }
  }, [id, currentWeekIso, dispatch, getToken, currentTimetable?.subject, currentTimetable?.gradeLevel]);

  // The type decides what the progress panel counts (e.g. "Próximo teste") and what the next steps offer.
  const handleTypeChange = useCallback(
    (slotOrWrapped: SlotWithTimetable | LessonSlot, type: LessonSlotType) => {
      void dispatch(updateLesson({ timetableId: id, lessonId: slotOrWrapped.id, params: { slotType: type } })).then(
        () => setProgressRefreshKey((key) => key + 1)
      );
    },
    [dispatch, id]
  );

  const handleTitleChange = useCallback(
    (slotOrWrapped: SlotWithTimetable | LessonSlot, title: string) => {
      dispatch(updateLesson({ timetableId: id, lessonId: slotOrWrapped.id, params: { topicTitle: title } }));
    },
    [dispatch, id]
  );

  const pendingThisWeek = currentWeekSlots.filter((s) => s.status === "pending").length;

  const timetableFailed = !!error && !isLoading && currentTimetable?.id !== id;
  const retryLoad = () => {
    dispatch(fetchTimetable(id));
    dispatch(fetchLessons({ timetableId: id }));
  };
  // Nearest week that has lessons, for the "no lessons this week" way out.
  const nearestWeekIso = useMemo(() => {
    const cur = new Date(`${currentWeekIso}T00:00:00`).getTime();
    let best: string | null = null;
    for (const ws of slotsByWeek.keys()) {
      const dist = Math.abs(new Date(`${ws}T00:00:00`).getTime() - cur);
      if (best === null || dist < Math.abs(new Date(`${best}T00:00:00`).getTime() - cur)) best = ws;
    }
    return best;
  }, [slotsByWeek, currentWeekIso]);

  const timetableColor = currentTimetable?.color ?? "#7F77DD";

  if (!featuresLoaded) return <ClassDetailLoading />;
  if (!enabled)
    return (
      <FeatureUnavailable
        title={t("shared.featureTitle")}
        description={t("shared.featureDescription")}
      />
    );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-24 pt-6 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={Routes.CALENDAR}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ background: timetableColor }}
          />
          {/* The short turma name everywhere else uses ("9.º Português · B"); the teacher's own
              name, which can be long, goes on one line under it. */}
          <div className="min-w-0">
            <h1 className="truncate font-semibold leading-tight" title={currentTimetable?.title}>
              {currentTimetable
                ? formatClassName(currentTimetable, {
                    gradeShort: (grade) => tTimetable("gradeShort", { grade }),
                    subject: translateSubject,
                  })
                : t("detail.loading")}
            </h1>
            {currentTimetable?.title && currentTimetable.title !== translateSubject(currentTimetable.subject)
              && !sameClassWords(currentTimetable.title, formatClassName(currentTimetable, {
                gradeShort: (grade) => tTimetable("gradeShort", { grade }),
                subject: translateSubject,
              })) && (
              <p className="truncate text-sm text-muted-foreground" title={currentTimetable.title}>
                {currentTimetable.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPro && replanEnabled && currentTimetable && (
            <Button variant="outline" size="sm" onClick={() => setReplanOpen(true)}>
              {tReplan("action")}
            </Button>
          )}
          {pendingThisWeek > 0 && (
            <Button
              size="sm"
              onClick={handleGenerateWeek}
              disabled={generatingWeek || isGenerating}
            >
              {generatingWeek ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {t("shared.generateWeek", { count: pendingThisWeek })}
            </Button>
          )}
        </div>
      </div>

      {timetableFailed && <LoadError onRetry={retryLoad} />}

      <PlanGenerationBanner timetableId={id} />

      {replanEnabled && (
        <ReviewFeedSection
          key={id}
          timetableId={id}
          refreshKey={progressRefreshKey}
          onOpenLesson={openLessonById}
          onChanged={reloadClassState}
        />
      )}

      <TurmaProgressPanel timetableId={id} refreshKey={progressRefreshKey} />
      <NextStepsCard timetableId={id} refreshKey={progressRefreshKey} />

      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2">
        <Button variant="ghost" size="icon" onClick={prevWeek}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setWeekStart(getWeekStart(new Date()))}
          className="text-sm font-medium hover:text-primary"
        >
          {formatWeekLabel(weekStart, locale)}
        </button>
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {replanEnabled && <TeachingMarkLegend className="px-1" />}

      {/* Week slot list */}
      {isSlotsLoading ? (
        <WeekSlotListSkeleton />
      ) : currentWeekSlots.length === 0 ? (
        nearestWeekIso ? (
          <EmptyState
            size="inline"
            icon={CalendarDays}
            title={t("detail.noLessonsThisWeek")}
            description={t("detail.navigateOtherWeek")}
            actions={
              <Button size="sm" onClick={() => setWeekStart(new Date(`${nearestWeekIso}T00:00:00`))}>
                {t("detail.goToNearestWeek")}
              </Button>
            }
          />
        ) : pendingTopics ? (
          <EmptyState
            size="inline"
            icon={CalendarDays}
            title={t("detail.preparingTitle")}
            description={t("detail.preparingDescription")}
          />
        ) : (
          <EmptyState
            size="inline"
            icon={CalendarDays}
            title={t("detail.noLessonsYet")}
            description={t("detail.noLessonsYetHint")}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link href={Routes.CALENDAR_SEQUENCES}>{t("shared.classesLink")}</Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-2">
          {currentWeekSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              color={timetableColor}
              onOpen={setSelectedSlot}
            />
          ))}
        </div>
      )}

      {isPro && replanEnabled && (
        <ReplanRequestDialog timetableId={id} open={replanOpen} onOpenChange={setReplanOpen} />
      )}

      {/* Shared slot dialog */}
      <SlotDialog
        slot={selectedSlotWithTimetable}
        isSlotGenerating={isGenerating}
        streamContent={streamContent || undefined}
        onClose={() => setSelectedSlot(null)}
        onGenerate={handleGenerateLesson}
        onRegenerate={handleRegenerateLesson}
        onTypeChange={handleTypeChange}
        onTitleChange={handleTitleChange}
        onCheckedIn={handleCheckedIn}
        onLessonsShifted={reloadClassState}
        onPreviousCheckedIn={reloadClassState}
        onFollowUpStarted={reloadClassState}
        onProposalResolved={reloadClassState}
      />
    </div>
  );
}
