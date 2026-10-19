"use client";
import { MAX_LENGTHS } from "@/shared/config/constants";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { Routes } from "@/shared/types";
import { LessonDocumentChips } from "@/components/dashboard/LessonDocumentChips";
import { PreviousLessonCheckIn } from "@/components/check-in/PreviousLessonCheckIn";
import { usePrepareLessonSet } from "@/components/dashboard/usePrepareLessonSet";
import { isDocumentInProgress } from "@/components/dashboard/weekWindow";
import { CheckInCard } from "@/components/check-in/CheckInCard";
import { TeachingMarkBadge } from "@/components/calendar/TeachingMarkBadge";
import { SLOT_STATUS_CONFIG } from "@/shared/constants/lessonSlotStatus";
import { translateSubject } from "@/components/document-creation/constants";
import type { CheckInRecord, CheckInSlotType, CheckInSubmission } from "@/shared/types/check-in";
import type { SlotWithTimetable } from "@/shared/types/calendar";
import {
  listLessonDocuments,
  type LessonDocument,
  type LessonSlotType,
} from "@/services/api/timetable.service";
import { checkInService } from "@/services/api/check-in.service";
import { followUpFor, useCheckInFollowUps, type CheckInFollowUp } from "@/hooks/useCheckInFollowUps";
import { useShiftFollowing } from "@/hooks/useShiftFollowing";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";

import {
  ChevronDown,
  Clock,
  Edit2,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import { readableTextOn, toIntlLocale, toIso } from "@/shared/utils/calendar";
import { canCheckIn, teachingMark } from "@/shared/utils/teachingStatus";

const ROLE_ROUTE: Record<string, string> = {
  lessonPlan: Routes.LESSON_PLAN,
  curriculumPlan: Routes.CURRICULUM_PLAN,
  quiz: Routes.QUIZ,
  test: Routes.TEST,
  worksheet: Routes.WORKSHEET,
  presentation: Routes.PRESENTATION,
};
function docUrl(role: string, documentId: string): string {
  return `${ROLE_ROUTE[role] ?? Routes.LESSON_PLAN}/${documentId}`;
}

export interface SlotDialogProps {
  slot: SlotWithTimetable | null;
  /** True when THIS specific slot is being generated. */
  isSlotGenerating: boolean;
  /** Optional streaming markdown content (shown while generating on sequence detail page). */
  streamContent?: string;
  onClose: () => void;
  /** Writes the lesson plan; resolves once the stream has ended (the parent may close the pop-up). */
  onGenerate: (slot: SlotWithTimetable, message?: string) => void | Promise<void>;
  onRegenerate: (slot: SlotWithTimetable, message?: string) => void;
  onTypeChange: (slot: SlotWithTimetable, type: LessonSlotType) => void;
  onTitleChange: (slot: SlotWithTimetable, title: string) => void;
  /** A document was added from this pop-up's chips (e.g. so the dashboard week refreshes). */
  onDocumentsChanged?: () => void;
  /** A check-in was saved here: the parent puts the new status on the slot (the card badge follows). */
  onCheckedIn?: (slot: SlotWithTimetable, record: CheckInRecord) => void;
  /** The lessons after this one were moved (ENG-194): the parent reloads the turma's slots. */
  onLessonsShifted?: (slot: SlotWithTimetable) => void;
  /** A check-in was saved on the previous lesson (PreviousLessonCheckIn): the parent reloads the turma's figures and slots. */
  onPreviousCheckedIn?: () => void;
}

export function SlotDialog({
  slot,
  isSlotGenerating,
  streamContent,
  onClose,
  onGenerate,
  onRegenerate,
  onTypeChange,
  onTitleChange,
  onDocumentsChanged,
  onCheckedIn,
  onLessonsShifted,
  onPreviousCheckedIn,
}: SlotDialogProps) {
  const t = useTranslations("calendar.slotDialog");
  const tShared = useTranslations("calendar.shared");
  const tTimetable = useTranslations("timetable");
  const tCheckIn = useTranslations("checkIns");
  const { shift: shiftFollowing } = useShiftFollowing();
  const { reinforce, carry } = useCheckInFollowUps();
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const router = useRouter();
  const checkInEnabled = useAppSelector(selectIsClassStateEnabled);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [slotDocs, setSlotDocs] = useState<LessonDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsOpen, setDocsOpen] = useState(true);
  /** Reopens the check-in card for a lesson that already has an answer ("Alterar"). */
  const [checkInEditing, setCheckInEditing] = useState(false);
  /** After "Não houve aula" here: asks inline whether to move the lessons after this one. */
  const [shiftAsk, setShiftAsk] = useState(false);
  /** After a check-in with outcomes picked: offers a reinforcement worksheet or the carry-over, inline. */
  const [followUp, setFollowUp] = useState<CheckInFollowUp | null>(null);

  const slotId = slot?.id;

  useEffect(() => {
    if (slot) {
      setDraftTitle(slot.topicTitle || "");
      setEditingTitle(false);
      setCustomMessage("");
      setCheckInEditing(false);
      setShiftAsk(false);
      setFollowUp(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  const reloadDocs = () => {
    if (!slot) return;
    listLessonDocuments(slot.timetable.id, slot.id)
      .then(setSlotDocs)
      .catch(() => {
        /* keep the list on screen; the next refresh retries */
      });
  };

  // Fetch linked documents for any teaching lesson: one-click documents don't need a plan first.
  useEffect(() => {
    if (!slot || slot.slotType === "HOLIDAY" || slot.status === "skipped") {
      setSlotDocs([]);
      return;
    }
    setDocsLoading(true);
    listLessonDocuments(slot.timetable.id, slot.id)
      .then(setSlotDocs)
      .catch(() => setSlotDocs([]))
      .finally(() => setDocsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  const lessonDocuments = slotDocs.map((d) => ({
    id: d.documentId,
    role: d.documentRole,
    documentType: d.documentType ?? d.documentRole,
    title: d.title,
    status: d.status ?? "completed",
  }));
  // While the documents load we don't know what's missing yet, so nothing is suggested.
  const {
    suggested,
    label: prepareLabel,
    preparing,
    prepare: handlePrepare,
    inFlight: preparingTypes,
  } = usePrepareLessonSet({
    timetableId: slot?.timetable.id ?? "",
    lessonId: slot?.id ?? "",
    slotDate: slot?.slotDate ?? "",
    slotType: slot?.slotType ?? "HOLIDAY",
    subject: slot?.timetable.subject,
    documents: lessonDocuments,
    ready:
      !!slot && !docsLoading && !isSlotGenerating && slot.status !== "generating" && slot.status !== "skipped",
    generatePlan: () => (slot ? onGenerate(slot, customMessage || undefined) : undefined),
    onDone: () => {
      reloadDocs();
      onDocumentsChanged?.();
    },
    surface: "lesson_popup",
  });

  // Failed attempts aren't documents the teacher has; the chips offer that type again.
  const visibleDocs = slotDocs.filter((d) => d.status !== "failed");

  // A one-click document is being written: refresh until it's ready.
  const docsInProgress = slotDocs.some((d) => isDocumentInProgress(d.status ?? "completed"));
  useEffect(() => {
    if (!docsInProgress) return;
    const id = window.setInterval(reloadDocs, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docsInProgress, slotId]);

  if (!slot) return null;

  const todayIso = toIso(new Date());
  const showCheckIn = canCheckIn(checkInEnabled, slot, todayIso);
  const checkInMark = teachingMark(slot, todayIso);
  const checkInItem = {
    slotDate: slot.slotDate,
    // Only shown for checkable types (see showCheckIn), so the cast holds wherever the card renders.
    slotType: slot.slotType as CheckInSlotType,
    turmaTitle: slot.timetable.title,
    subject: slot.timetable.subject,
    topicTitle: slot.topicTitle || null,
    outcomes: slot.outcomes ?? [],
  };

  // Same saving and toasts as the dashboard strip (CheckInStrip).
  const handleCheckIn = async (body: CheckInSubmission) => {
    try {
      const record = await checkInService.submit(slot.timetable.id, slot.id, body);
      setCheckInEditing(false);
      onCheckedIn?.(slot, record);
    } catch {
      toast.error(tCheckIn("saveError"));
      return;
    }
    // Inline, not a toast: the toast sits under this dialog's overlay and would expire unseen.
    if (body.result === "NOT_HELD") setShiftAsk(true);
    setFollowUp(followUpFor(body));
    if (body.result === "TAUGHT") {
      toast.success(tCheckIn("taughtToast"), {
        action: {
          label: tCheckIn("prepareNext"),
          onClick: () => router.push(`${Routes.CALENDAR}/${slot.timetable.id}`),
        },
      });
    }
  };

  const color = slot.timetable.color || "#7F77DD";
  const cfg = SLOT_STATUS_CONFIG[slot.status];
  const canGenerate =
    (slot.status === "pending" || slot.status === "failed") && !isSlotGenerating;
  const isCompleted = slot.status === "completed";
  const isAssessment = slot.slotType === "ASSESSMENT";
  const isExercise = slot.slotType === "EXERCISE";
  const isReview = slot.slotType === "REVIEW";
  const isHoliday = slot.slotType === "HOLIDAY";

  const handleFollowUp = async () => {
    if (!followUp) return;
    const done =
      followUp.kind === "reinforcement"
        ? await reinforce(slot.timetable.id, slot.id, followUp.outcomeIds)
        : await carry(slot.timetable.id, slot.id, followUp.outcomeIds);
    if (done) setFollowUp(null);
  };

  const handleShift = async () => {
    setShiftAsk(false);
    const result = await shiftFollowing(slot.timetable.id, slot.id);
    if (result) onLessonsShifted?.(slot);
  };

  const handleTitleSave = () => {
    if (draftTitle.trim() !== slot.topicTitle && (draftTitle.trim() !== "" || isHoliday)) {
      onTitleChange(slot, draftTitle.trim());
    }
    setEditingTitle(false);
  };

  const dateLabel = new Date(`${slot.slotDate}T00:00:00`).toLocaleDateString(toIntlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Dialog open={!!slot} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
        {/* Colored header strip */}
        <div className="h-1 w-full" style={{ background: color }} />

        <div className="p-6">
          <DialogHeader className="mb-4">
            {/* Subject pill + status badge */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: color, color: readableTextOn(color) }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                {slot.timetable.gradeLevel ? `${tTimetable("gradeShort", { grade: slot.timetable.gradeLevel })} ` : ""}
                {translateSubject(slot.timetable.subject)}
                {slot.timetable.classLabel ? ` · ${slot.timetable.classLabel}` : ""}
              </span>
              <Badge className={`gap-1 border text-xs ${cfg.badgeCls}`}>
                {cfg.icon}
                {tTimetable(`status.${slot.status}`)}
              </Badge>
              {isAssessment && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  {tTimetable("slotType.assessment")}
                </Badge>
              )}
              {isExercise && (
                <Badge variant="outline" className="text-xs text-sky-600 border-sky-300">
                  {tTimetable("slotType.exercise")}
                </Badge>
              )}
              {isReview && (
                <Badge variant="outline" className="text-xs text-violet-600 border-violet-300">
                  {tTimetable("slotType.review")}
                </Badge>
              )}
            </div>

            {/* Editable title */}
            {editingTitle ? (
              <Input
                autoFocus
                maxLength={MAX_LENGTHS.LESSON_TOPIC}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="h-9 text-base font-semibold"
              />
            ) : (
              <DialogTitle
                className="group/title flex cursor-text items-start gap-1.5 text-left text-base leading-snug"
                onClick={() => !isHoliday && setEditingTitle(true)}
                title={isHoliday ? undefined : t("editTopicTitle")}
              >
                <span className="min-w-0 wrap-anywhere hover:underline decoration-dashed underline-offset-2">
                  {isHoliday ? slot.topicTitle || tShared("holidayNoLesson") : slot.topicTitle}
                </span>
                {!isHoliday && (
                  <Edit2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-60" />
                )}
              </DialogTitle>
            )}

            <DialogDescription className="mt-1 flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {t("lessonNumber", { number: slot.sequenceNumber })} · {dateLabel}
              {slot.durationMinutes > 0 && ` · ${tShared("minutesSuffix", { count: slot.durationMinutes })}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* ENG-224: asks about the previous lesson, only when this slot is not itself checkable (see PreviousLessonCheckIn) */}
            {!isHoliday && (
              <PreviousLessonCheckIn
                timetableId={slot.timetable.id}
                lessonId={slot.id}
                dialogSlot={slot}
                onCheckedIn={onPreviousCheckedIn}
              />
            )}

            {/* Slot type selector */}
            {!isHoliday && (
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground">{t("typeLabel")}</Label>
                <Select
                  value={slot.slotType}
                  onValueChange={(v) => onTypeChange(slot, v as LessonSlotType)}
                >
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LESSON">{tTimetable("slotType.lesson")}</SelectItem>
                    <SelectItem value="ASSESSMENT">{tTimetable("slotType.assessment")}</SelectItem>
                    <SelectItem value="HOLIDAY">{tTimetable("slotType.holiday")}</SelectItem>
                    <SelectItem value="EXERCISE">{tTimetable("slotType.exercise")}</SelectItem>
                    <SelectItem value="REVIEW">{tTimetable("slotType.review")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Learning objectives — populated by backend after topic generation */}
            {!isHoliday && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("objectivesTitle")}
                  </p>
                  {slot.description ? (
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                      {slot.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground/60">
                      {isSlotGenerating
                        ? t("objectivesProcessing")
                        : t("objectivesEmpty")}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Stream preview (shown while SSE generation is in progress) */}
            {streamContent && isSlotGenerating && (
              <>
                <Separator />
                <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {streamContent}
                </div>
              </>
            )}

            {/* "Como correu?" for a past, checkable lesson (class_state_enabled only) */}
            {showCheckIn && (
              <>
                <Separator />
                <section aria-label={tCheckIn("title")} className="space-y-2">
                  {slot.checkedInAt && !checkInEditing && checkInMark ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">{tCheckIn("currentStatus")}:</span>
                        <TeachingMarkBadge mark={checkInMark} />
                        <span className="font-medium text-foreground">{tCheckIn(`mark.${checkInMark.key}`)}</span>
                      </p>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setCheckInEditing(true)}>
                        {tCheckIn("changeAnswer")}
                      </Button>
                    </div>
                  ) : (
                    <CheckInCard
                      key={slot.id}
                      item={checkInItem}
                      locale={locale}
                      onSubmit={(body) => void handleCheckIn(body)}
                      onCancel={slot.checkedInAt ? () => setCheckInEditing(false) : undefined}
                    />
                  )}
                  {shiftAsk && (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2">
                      <span className="text-sm text-foreground">{tCheckIn("shiftQuestion")}</span>
                      <Button size="sm" className="h-8" onClick={() => void handleShift()}>
                        {tCheckIn("shiftAction")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setShiftAsk(false)}>
                        {tCheckIn("shiftKeep")}
                      </Button>
                    </div>
                  )}
                  {followUp && (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2">
                      <span className="text-sm text-foreground">
                        {tCheckIn(followUp.kind === "reinforcement" ? "reinforcementQuestion" : "carryOverQuestion")}
                      </span>
                      <Button size="sm" className="h-8" onClick={() => void handleFollowUp()}>
                        {tCheckIn(followUp.kind === "reinforcement" ? "reinforcementAction" : "carryOverAction")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setFollowUp(null)}>
                        {tCheckIn("followUpKeep")}
                      </Button>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* Generated documents accordion */}
            {!isHoliday && slot.status !== "skipped" && (
              <>
                <Separator />
                <div>
                  <button
                    type="button"
                    onClick={() => setDocsOpen((p) => !p)}
                    className="flex w-full items-center justify-between py-0.5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("documentsTitle")}
                      {visibleDocs.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {visibleDocs.length}
                        </span>
                      )}
                    </p>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${docsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {docsOpen && (
                    <div className="mt-1.5 space-y-1">
                      {docsLoading ? (
                        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t("loadingDocuments")}
                        </div>
                      ) : visibleDocs.length === 0 ? (
                        <p className="py-1 text-xs text-muted-foreground">
                          {t("noDocuments")}
                        </p>
                      ) : null}
                    </div>
                  )}
                  {/* One-click documents for this lesson, same as on the dashboard. */}
                  <div className="mt-2">
                    <LessonDocumentChips
                      compact
                      timetableId={slot.timetable.id}
                      onLessonPlan={() => void onGenerate(slot, customMessage || undefined)}
                      lessonPlanBusy={isSlotGenerating}
                      busyTypes={preparingTypes}
                      lesson={{ id: slot.id, slotType: slot.slotType, documents: lessonDocuments }}
                      onChanged={() => {
                        reloadDocs();
                        onDocumentsChanged?.();
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Linked curriculum plan */}
            {slot.timetable.linkedCurriculumPlan && (
              <button
                type="button"
                onClick={() => {
                  const planId = slot.timetable.linkedCurriculumPlan;
                  onClose();
                  router.push(`${Routes.CURRICULUM_PLAN}/${planId}`);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {t("viewLinkedPlan")}
              </button>
            )}

            {/* Custom generation instruction */}
            {(canGenerate || isCompleted) && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("additionalInstructionLabel")}
                </Label>
                <Input
                  placeholder={t("additionalInstructionPlaceholder")}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {!isHoliday && (
          <DialogFooter className="border-t bg-muted/30 px-6 py-4 gap-2">
            {(canGenerate || isCompleted) && <AiDisclaimer className="sm:mr-auto sm:self-center sm:text-left" />}
            {isCompleted && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onRegenerate(slot, customMessage || undefined)}
                  disabled={isSlotGenerating || preparing}
                  className="h-9 rounded-lg"
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  {t("regenerate")}
                </Button>
                <Button
                  variant={suggested.length > 0 ? "outline" : "default"}
                  onClick={() => {
                    const plan = visibleDocs.find((d) => d.documentRole === "lessonPlan");
                    onClose();
                    router.push(
                      plan ? docUrl(plan.documentRole, plan.documentId) : Routes.DOCUMENTS,
                    );
                  }}
                  className="h-9 rounded-lg"
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  {t("openLessonPlan")}
                </Button>
              </>
            )}
            {isSlotGenerating || preparing ? (
              <Button disabled className="h-9 rounded-lg">
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {t("generating")}
              </Button>
            ) : suggested.length > 0 ? (
              <Button onClick={() => void handlePrepare()} className="h-9 rounded-lg">
                <Sparkles className="mr-1.5 h-4 w-4" />
                {prepareLabel}
              </Button>
            ) : null}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
