"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import {
  fetchTimetable,
  fetchLessons,
  generateTopics,
  skipLesson,
  setSlotStatus,
  updateLesson,
} from "@/store/timetable/timetableSlice";
import { useAppDispatch } from "@/store/hooks";
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
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";

import { SLOT_STATUS_CONFIG } from "@/shared/constants/lessonSlotStatus";
import { SlotDialog } from "@/components/calendar/SlotDialog";
import type { SlotWithTimetable } from "@/shared/types/calendar";
import { toIso, getWeekStart, addDays, formatWeekLabel } from "@/shared/utils/calendar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/nextjs";

// ─────────────────────── Types / helpers ─────────────────────────────────────

type WeekMap = Map<string, LessonSlot[]>;

const STATUS_CONFIG = SLOT_STATUS_CONFIG;

// ─────────────────────── Skeleton ────────────────────────────────────────────

function SlotCardSkeleton({ color }: { color?: string }) {
  return (
    <div
      className="animate-pulse w-full rounded-lg border border-border/60 min-h-[76px]"
      style={{ borderLeftWidth: "4px", borderLeftColor: color ?? "#d1d5db" }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-7 h-3 rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-4/5 rounded bg-muted" />
          <div className="h-2.5 w-3/5 rounded bg-muted/70" />
          <div className="h-2 w-2/5 rounded bg-muted/50" />
        </div>
        <div className="h-5 w-16 rounded-full bg-muted/60" />
      </div>
    </div>
  );
}

// ─────────────────────── Slot card (list-view) ───────────────────────────────

interface SlotCardProps {
  slot: LessonSlot;
  color: string;
  subject: string;
  classLabel: string;
  onOpen: (slot: LessonSlot) => void;
}

function SlotCard({ slot, color, subject, classLabel, onOpen }: SlotCardProps) {
  const isHoliday = slot.slotType === "HOLIDAY";
  const isFailed = slot.status === "failed";
  const cfg = STATUS_CONFIG[slot.status];
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
      } ${isFailed ? "bg-red-50 dark:bg-red-950/20" : ""}`}
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
            {isHoliday ? "Feriado / Sem aula" : slot.topicTitle || "Sem tópico definido"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(`${slot.slotDate}T00:00:00`).toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {" · "}{slot.durationMinutes} min
          </p>
          <p className="text-xs text-muted-foreground/70">
            {subject}{classLabel ? ` · Turma ${classLabel}` : ""}
          </p>
          {isFailed && (
            <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-0.5">
              <AlertTriangle className="h-3 w-3" />
              Falhou a geração
            </p>
          )}
        </div>
        {!isHoliday && (
          <Badge className={`shrink-0 gap-1 border text-xs ${cfg.badgeCls}`}>
            {cfg.icon}
            {cfg.label}
          </Badge>
        )}
      </div>
    </button>
  );
}

// ─────────────────────── Main page ───────────────────────────────────────────

export default function CalendarViewPage() {
  const params = useParams();
  const id = params.id as string;
  const enabled = useSelector(selectIsHorarioPlanosEnabled);
  const { currentTimetable, slots, isSlotsLoading, isGeneratingTopics } =
    useSelector((state: RootState) => state.timetable);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { getToken } = useAuth();

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const streamRef = useRef("");

  useEffect(() => {
    if (!enabled) { router.replace(Routes.DASHBOARD); return; }
    dispatch(fetchTimetable(id));
    dispatch(fetchLessons({ timetableId: id }));
  }, [enabled, id, dispatch, router]);

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

  // Wrap the selected slot with the current timetable for the shared SlotDialog
  const selectedSlotWithTimetable = useMemo<SlotWithTimetable | null>(() => {
    if (!selectedSlot || !currentTimetable) return null;
    return { ...selectedSlot, timetable: currentTimetable };
  }, [selectedSlot, currentTimetable]);

  const handleGenerateLesson = useCallback(
    async (slotOrWrapped: SlotWithTimetable | LessonSlot, message?: string) => {
      const slot = slotOrWrapped as LessonSlot;
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
              dispatch(setSlotStatus({ slotId: slot.id, status: "completed" }));
              dispatch(fetchLessons({ timetableId: id }));
              setSelectedSlot(null);
            },
            onError: () => dispatch(setSlotStatus({ slotId: slot.id, status: "failed" })),
          },
          getToken
        );
      } finally {
        setIsGenerating(false);
        setStreamContent("");
        streamRef.current = "";
      }
    },
    [id, dispatch, getToken]
  );

  const handleRegenerateLesson = useCallback(
    async (slotOrWrapped: SlotWithTimetable | LessonSlot, message?: string) => {
      const slot = slotOrWrapped as LessonSlot;
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
              dispatch(setSlotStatus({ slotId: slot.id, status: "completed" }));
              dispatch(fetchLessons({ timetableId: id }));
              setSelectedSlot(null);
            },
            onError: () => dispatch(setSlotStatus({ slotId: slot.id, status: "failed" })),
          },
          getToken
        );
      } finally {
        setIsGenerating(false);
        setStreamContent("");
        streamRef.current = "";
      }
    },
    [id, dispatch, getToken]
  );

  const handleGenerateWeek = useCallback(async () => {
    setGeneratingWeek(true);
    try {
      await generateWeekStream(
        id,
        currentWeekIso,
        {
          onSlotStart: (slotId) => dispatch(setSlotStatus({ slotId, status: "generating" })),
          onSlotDone: (slotId) => dispatch(setSlotStatus({ slotId, status: "completed" })),
          onSlotError: (slotId) => dispatch(setSlotStatus({ slotId, status: "failed" })),
          onDone: () => dispatch(fetchLessons({ timetableId: id })),
        },
        getToken
      );
    } finally {
      setGeneratingWeek(false);
    }
  }, [id, currentWeekIso, dispatch, getToken]);

  const handleSkip = useCallback(
    (slotOrWrapped: SlotWithTimetable | LessonSlot) => {
      dispatch(skipLesson({ timetableId: id, lessonId: slotOrWrapped.id }));
      setSelectedSlot(null);
    },
    [dispatch, id]
  );

  const handleTypeChange = useCallback(
    (slotOrWrapped: SlotWithTimetable | LessonSlot, type: LessonSlotType) => {
      dispatch(updateLesson({ timetableId: id, lessonId: slotOrWrapped.id, params: { slotType: type } }));
    },
    [dispatch, id]
  );

  const handleTitleChange = useCallback(
    (slotOrWrapped: SlotWithTimetable | LessonSlot, title: string) => {
      dispatch(updateLesson({ timetableId: id, lessonId: slotOrWrapped.id, params: { topicTitle: title } }));
    },
    [dispatch, id]
  );

  const handleGenerateTopics = useCallback(() => {
    dispatch(generateTopics(id)).then(() => dispatch(fetchLessons({ timetableId: id })));
  }, [dispatch, id]);

  const pendingThisWeek = currentWeekSlots.filter((s) => s.status === "pending").length;

  const slotsWithoutTopic = useMemo(
    () => slots.filter((s) => !s.topicTitle && s.slotType === "LESSON" && s.status !== "skipped").length,
    [slots]
  );

  const timetableColor = currentTimetable?.color ?? "#7F77DD";
  const timetableSubject = currentTimetable?.subject ?? "";
  const timetableClassLabel = currentTimetable?.classLabel ?? "";

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={Routes.CALENDAR}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ background: timetableColor }}
          />
          <div>
            <h1 className="font-semibold leading-tight">
              {currentTimetable?.title ?? "A carregar..."}
            </h1>
            {currentTimetable && (
              <p className="text-sm text-muted-foreground">
                {currentTimetable.subject} · {currentTimetable.gradeLevel}.º ano
                {currentTimetable.classLabel ? ` · Turma ${currentTimetable.classLabel}` : ""}
              </p>
            )}
          </div>
        </div>

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
            Gerar semana ({pendingThisWeek})
          </Button>
        )}
      </div>

      {/* Missing topics banner */}
      {!isSlotsLoading && slotsWithoutTopic > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            {slotsWithoutTopic} aula{slotsWithoutTopic !== 1 ? "s" : ""} sem tópico definido.{" "}
            <button
              type="button"
              onClick={handleGenerateTopics}
              disabled={isGeneratingTopics}
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              {isGeneratingTopics ? "A gerar…" : "Gerar tópicos agora"}
            </button>
          </span>
        </div>
      )}

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
          {formatWeekLabel(weekStart)}
        </button>
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week slot list */}
      {isSlotsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SlotCardSkeleton key={i} color={timetableColor} />
          ))}
        </div>
      ) : currentWeekSlots.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-3 h-10 w-10" />
          <p>Sem aulas programadas para esta semana.</p>
          <p className="mt-1 text-sm">
            {slots.length === 0
              ? "Ainda não tens aulas criadas para este plano letivo."
              : "Navega para outra semana."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentWeekSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              color={timetableColor}
              subject={timetableSubject}
              classLabel={timetableClassLabel}
              onOpen={setSelectedSlot}
            />
          ))}
        </div>
      )}

      {/* Shared slot dialog */}
      <SlotDialog
        slot={selectedSlotWithTimetable}
        isSlotGenerating={isGenerating}
        streamContent={streamContent || undefined}
        onClose={() => setSelectedSlot(null)}
        onGenerate={handleGenerateLesson}
        onRegenerate={handleRegenerateLesson}
        onSkip={handleSkip}
        onTypeChange={handleTypeChange}
        onTitleChange={handleTitleChange}
      />
    </div>
  );
}
