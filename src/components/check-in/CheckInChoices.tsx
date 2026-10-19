"use client";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import type { CheckInResult, CheckInOutcome } from "@/shared/types/check-in";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/**
 * The four "Como correu?" results as buttons (✓ ~ ½ ✕). Shared by the dashboard card, the calendar
 * dialog and the in-flow prompt, so all three look and behave the same.
 */
export function CheckInResultOptions({
  onChoose,
  className = "grid grid-cols-2 gap-2 sm:grid-cols-4",
}: {
  onChoose: (result: CheckInResult) => void;
  className?: string;
}) {
  const t = useTranslations("checkIns");
  const options: { result: CheckInResult; label: string; glyph: string }[] = [
    { result: "TAUGHT", label: t("resultTaught"), glyph: "✓" },
    { result: "TAUGHT_WITH_DIFFICULTIES", label: t("resultDifficulties"), glyph: "~" },
    { result: "PARTIAL", label: t("resultPartial"), glyph: "½" },
    { result: "NOT_HELD", label: t("resultNotHeld"), glyph: "✕" },
  ];
  return (
    <div className={className}>
      {options.map((option) => (
        <Button
          key={option.result}
          variant="outline"
          className="h-auto min-h-9 justify-start whitespace-normal bg-card py-2 text-left"
          onClick={() => onChoose(option.result)}
        >
          <span aria-hidden className="w-3 shrink-0 text-center font-semibold">
            {option.glyph}
          </span>
          {option.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * The outcome step for "algumas tiveram dificuldades" and "ficou a meio": the chips to pick from, then
 * confirm / skip / back. `extraActions` lets a caller add its own button (the calendar's "cancel").
 */
export function CheckInOutcomeStep({
  question,
  outcomes,
  selected,
  onToggle,
  onConfirm,
  onSkip,
  onBack,
  extraActions,
}: {
  question: string;
  outcomes: CheckInOutcome[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onBack: () => void;
  extraActions?: ReactNode;
}) {
  const t = useTranslations("checkIns");
  return (
    <>
      <p className="text-sm font-medium text-foreground">{question}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={question}>
        {outcomes.map((outcome) => (
          <ChoiceChip
            key={outcome.id}
            selected={selected.includes(outcome.id)}
            showCheck
            title={outcome.topicPath.join(" › ")}
            onClick={() => onToggle(outcome.id)}
          >
            {outcome.text}
          </ChoiceChip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onConfirm}>
          {t("confirm")}
        </Button>
        <Button size="sm" variant="outline" onClick={onSkip}>
          {t("skip")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
        {extraActions}
      </div>
    </>
  );
}
