"use client";

import { Button } from "@/components/ui/button";
import type { PreviousLessonCheckIn as PreviousCheckIn } from "@/services/api/timetable.service";
import type { CheckInOutcome, CheckInResult, CheckInSubmission } from "@/shared/types/check-in";
import { isCheckableSlot, type TeachingSlotInput } from "@/shared/utils/teachingStatus";
import { toIso } from "@/shared/utils/calendar";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { buildSubmission, needsOutcomeStep } from "@/hooks/checkInQueue";
import { CheckInOutcomeStep, CheckInResultOptions } from "./CheckInChoices";
import {
  answerPreviousLesson,
  loadPreviousCheckIn,
  phaseAfterSave,
  previousCheckInVisible,
  type SavedPhase,
} from "./previousCheckInLogic";

type OutcomeResult = Extract<CheckInResult, "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL">;

interface PreviousLessonCheckInProps {
  timetableId: string;
  /** The lesson being prepared. The prompt asks about the lesson before it. */
  lessonId: string;
  /** The dialog's own slot. A past, checkable slot has its own question in the dialog, so no prompt here. */
  dialogSlot: TeachingSlotInput;
  /** Fires after the answer is saved, so the turma's progress and the previous lesson's mark can refresh. */
  onCheckedIn?: () => void;
}

/**
 * "A última aula correu bem?" at the top of the lesson creation flow (ENG-224). One line, skippable, and it
 * never gates generation. Answering saves a normal check-in on the previous lesson, which the new lesson's
 * generation then reads. Hidden unless `class_state_enabled` is on.
 */
export function PreviousLessonCheckIn({ timetableId, lessonId, dialogSlot, onCheckedIn }: PreviousLessonCheckInProps) {
  const t = useTranslations("previousCheckIn");
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const todayIso = toIso(new Date());

  const [pending, setPending] = useState<PreviousCheckIn | null>(null);
  const [hidden, setHidden] = useState(false);
  const [saved, setSaved] = useState<SavedPhase | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setPending(null);
    setHidden(false);
    setSaved(null);
    setSaveFailed(false);
    setOutcomeResult(null);
    setSelected([]);
    void loadPreviousCheckIn(enabled, timetableId, lessonId).then((found) => {
      if (!cancelled) setPending(found);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, timetableId, lessonId]);

  const visible = previousCheckInVisible({
    enabled,
    pending,
    hidden,
    dialogSlotCheckable: isCheckableSlot(dialogSlot, todayIso),
  });
  if (!visible || !pending) return null;

  const answer = async (body: CheckInSubmission) => {
    const ok = await answerPreviousLesson(timetableId, pending, body);
    const phase = phaseAfterSave(ok, body.result);
    if (phase) {
      setSaved(phase);
      setSaveFailed(false);
      onCheckedIn?.();
    } else {
      setSaveFailed(true);
    }
  };

  return (
    <PreviousLessonCheckInView
      question={pending.topicTitle ? t("questionWithTopic", { topic: pending.topicTitle }) : t("question")}
      saved={saved}
      saveFailed={saveFailed}
      outcomeResult={outcomeResult}
      outcomes={pending.outcomes}
      selected={selected}
      onChoose={(result: CheckInResult) => {
        if (needsOutcomeStep(result, pending)) {
          setSelected([]);
          setOutcomeResult(result as OutcomeResult);
          return;
        }
        void answer(buildSubmission(result));
      }}
      onToggle={(id) =>
        setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
      }
      onConfirm={() => {
        if (outcomeResult) void answer(buildSubmission(outcomeResult, selected));
      }}
      onSkipOutcomes={() => {
        if (outcomeResult) void answer(buildSubmission(outcomeResult));
      }}
      onBackOutcomes={() => setOutcomeResult(null)}
      onNotNow={() => setHidden(true)}
    />
  );
}

/**
 * The prompt's markup, separate from the container's loading and saving so each phase can be rendered and
 * checked on its own: the one-line question with the four results, the outcome step, the short confirmation
 * that replaces them after a save, and the save error.
 */
export function PreviousLessonCheckInView({
  question,
  saved,
  saveFailed,
  outcomeResult,
  outcomes,
  selected,
  onChoose,
  onToggle,
  onConfirm,
  onSkipOutcomes,
  onBackOutcomes,
  onNotNow,
}: {
  question: string;
  saved: SavedPhase | null;
  saveFailed: boolean;
  outcomeResult: OutcomeResult | null;
  outcomes: CheckInOutcome[];
  selected: readonly string[];
  onChoose: (result: CheckInResult) => void;
  onToggle: (id: string) => void;
  onConfirm: () => void;
  onSkipOutcomes: () => void;
  onBackOutcomes: () => void;
  onNotNow: () => void;
}) {
  const t = useTranslations("previousCheckIn");
  const tc = useTranslations("checkIns");

  if (saved) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {saved === "savedWithContext" ? t("savedWithContext") : t("saved")}
      </p>
    );
  }

  return (
    <section aria-label={question} className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
      {outcomeResult ? (
        <>
          {/* Keeps the lesson in view: the outcome question alone does not say which lesson it is about. */}
          <span className="text-sm text-muted-foreground">{question}</span>
          <CheckInOutcomeStep
            question={outcomeResult === "PARTIAL" ? tc("uncoveredQuestion") : tc("difficultiesQuestion")}
            outcomes={outcomes}
            selected={selected}
            onToggle={onToggle}
            onConfirm={onConfirm}
            onSkip={onSkipOutcomes}
            onBack={onBackOutcomes}
          />
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-foreground">{question}</span>
          <CheckInResultOptions onChoose={onChoose} className="flex flex-wrap items-center gap-1.5" />
          <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={onNotNow}>
            {t("notNow")}
          </Button>
        </div>
      )}
      {saveFailed && <p className="text-xs text-destructive">{tc("saveError")}</p>}
    </section>
  );
}
