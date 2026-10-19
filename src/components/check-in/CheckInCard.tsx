"use client";

import { translateSubject } from "@/components/document-creation/constants";
import { relativeDayLabel } from "@/components/dashboard/checkInDay";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { buildSubmission, isAssessmentCheckIn, needsOutcomeStep } from "@/hooks/checkInQueue";
import type { CheckInResult, CheckInSubmission, PendingCheckIn } from "@/shared/types/check-in";
import { toIso } from "@/shared/utils/calendar";
import { useTranslations } from "next-intl";
import { useState } from "react";

type OutcomeResult = Extract<CheckInResult, "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL">;

/** What the card needs to ask about one lesson, so the dashboard and the calendar can both use it. */
export type CheckInCardItem = Pick<
  PendingCheckIn,
  "slotDate" | "slotType" | "turmaTitle" | "subject" | "topicTitle" | "outcomes"
>;

interface CheckInCardProps {
  item: CheckInCardItem;
  locale: string;
  onSubmit: (body: CheckInSubmission) => void;
  /** "Ainda não" on a test: sets it aside for the session. Only the dashboard queue passes it. */
  onSkip?: () => void;
  /** Closes the card without saving. Only the calendar dialog passes it, when reopened to change an answer. */
  onCancel?: () => void;
}

/**
 * "Como correu a aula?" for one lesson: the four results, then the outcome chips for the
 * difficulties and "ficou a meio" answers. Shared by the dashboard strip and the calendar dialog.
 */
export function CheckInCard({ item, locale, onSubmit, onSkip, onCancel }: CheckInCardProps) {
  const t = useTranslations("checkIns");
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const todayIso = toIso(new Date());
  const day = relativeDayLabel(item.slotDate, todayIso, locale, {
    today: t("dayToday"),
    yesterday: t("dayYesterday"),
    daysAgo: (count) => t("daysAgo", { count }),
  });
  const subject = translateSubject(item.subject);
  const meta = item.topicTitle
    ? t("meta", { turma: item.turmaTitle, subject, topic: item.topicTitle, day })
    : t("metaNoTopic", { turma: item.turmaTitle, subject, day });

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const choose = (result: CheckInResult) => {
    if (needsOutcomeStep(result, item)) {
      setSelected([]);
      setOutcomeResult(result as OutcomeResult);
      return;
    }
    onSubmit(buildSubmission(result));
  };

  const header = (
    <div className="min-w-0">
      <h3 className="text-base font-semibold leading-snug text-foreground">
        {isAssessmentCheckIn(item) ? t("assessmentQuestion") : t("title")}
      </h3>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta}</p>
    </div>
  );

  const cancelButton = onCancel ? (
    <Button size="sm" variant="ghost" onClick={onCancel}>
      {t("cancel")}
    </Button>
  ) : null;

  if (isAssessmentCheckIn(item)) {
    return (
      <div className="space-y-3">
        {header}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onSubmit({ result: "TAUGHT" })}>
            {t("assessmentYes")}
          </Button>
          {onSkip && (
            <Button size="sm" variant="outline" onClick={onSkip}>
              {t("assessmentNotYet")}
            </Button>
          )}
          {cancelButton}
        </div>
      </div>
    );
  }

  if (outcomeResult) {
    const question = outcomeResult === "PARTIAL" ? t("uncoveredQuestion") : t("difficultiesQuestion");
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm font-medium text-foreground">{question}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={question}>
          {item.outcomes.map((outcome) => (
            <ChoiceChip
              key={outcome.id}
              selected={selected.includes(outcome.id)}
              showCheck
              title={outcome.topicPath.join(" › ")}
              onClick={() => toggle(outcome.id)}
            >
              {outcome.text}
            </ChoiceChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => onSubmit(buildSubmission(outcomeResult, selected))}>
            {t("confirm")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSubmit(buildSubmission(outcomeResult))}>
            {t("skip")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOutcomeResult(null)}>
            {t("back")}
          </Button>
          {cancelButton}
        </div>
      </div>
    );
  }

  const options: { result: CheckInResult; label: string; glyph: string }[] = [
    { result: "TAUGHT", label: t("resultTaught"), glyph: "✓" },
    { result: "TAUGHT_WITH_DIFFICULTIES", label: t("resultDifficulties"), glyph: "~" },
    { result: "PARTIAL", label: t("resultPartial"), glyph: "½" },
    { result: "NOT_HELD", label: t("resultNotHeld"), glyph: "✕" },
  ];

  return (
    <div className="space-y-3">
      {header}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => (
          <Button
            key={option.result}
            variant="outline"
            className="h-auto min-h-9 justify-start whitespace-normal bg-card py-2 text-left"
            onClick={() => choose(option.result)}
          >
            <span aria-hidden className="w-3 shrink-0 text-center font-semibold">
              {option.glyph}
            </span>
            {option.label}
          </Button>
        ))}
      </div>
      {cancelButton && <div>{cancelButton}</div>}
    </div>
  );
}
