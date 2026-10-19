"use client";

import { translateSubject } from "@/components/document-creation/constants";
import { relativeDayLabel } from "@/components/dashboard/checkInDay";
import { Button } from "@/components/ui/button";
import { buildSubmission, isAssessmentCheckIn, needsOutcomeStep } from "@/hooks/checkInQueue";
import type { CheckInResult, CheckInSubmission, PendingCheckIn } from "@/shared/types/check-in";
import { CheckInOutcomeStep, CheckInResultOptions } from "./CheckInChoices";
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
        <CheckInOutcomeStep
          question={question}
          outcomes={item.outcomes}
          selected={selected}
          onToggle={toggle}
          onConfirm={() => onSubmit(buildSubmission(outcomeResult, selected))}
          onSkip={() => onSubmit(buildSubmission(outcomeResult))}
          onBack={() => setOutcomeResult(null)}
          extraActions={cancelButton}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      <CheckInResultOptions onChoose={choose} />
      {cancelButton && <div>{cancelButton}</div>}
    </div>
  );
}
