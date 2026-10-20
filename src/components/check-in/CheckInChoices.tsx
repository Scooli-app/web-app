"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckInResult, CheckInOutcome } from "@/shared/types/check-in";
import { cn } from "@/shared/utils/utils";
import { AlertTriangle, CheckCircle2, CircleDashed, XCircle, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/*
 * Each result's icon and tint, so the four read as cards in both themes: a tinted fill (about 8% light, 10% dark),
 * a coloured border (about 35-40%), and a stronger fill and border on hover and keyboard focus. The text colour is
 * the -700 (light) or -300 (dark) shade. The class names are written out in full so Tailwind generates them.
 * The dark hover and focus fills are `dark:hover:` / `dark:focus-visible:` so they win over the dark base fill.
 */
const RESULT_STYLE: Record<CheckInResult, { icon: LucideIcon; tone: string }> = {
  TAUGHT: {
    icon: CheckCircle2,
    tone: "border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-700 hover:border-emerald-500/60 hover:bg-emerald-500/[0.14] focus-visible:border-emerald-500/60 focus-visible:bg-emerald-500/[0.14] dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 dark:focus-visible:bg-emerald-500/20",
  },
  TAUGHT_WITH_DIFFICULTIES: {
    icon: AlertTriangle,
    tone: "border-amber-500/35 bg-amber-500/[0.08] text-amber-700 hover:border-amber-500/60 hover:bg-amber-500/[0.14] focus-visible:border-amber-500/60 focus-visible:bg-amber-500/[0.14] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 dark:focus-visible:bg-amber-500/20",
  },
  PARTIAL: {
    icon: CircleDashed,
    tone: "border-sky-500/35 bg-sky-500/[0.08] text-sky-700 hover:border-sky-500/60 hover:bg-sky-500/[0.14] focus-visible:border-sky-500/60 focus-visible:bg-sky-500/[0.14] dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20 dark:focus-visible:bg-sky-500/20",
  },
  NOT_HELD: {
    icon: XCircle,
    tone: "border-rose-500/35 bg-rose-500/[0.08] text-rose-700 hover:border-rose-500/60 hover:bg-rose-500/[0.14] focus-visible:border-rose-500/60 focus-visible:bg-rose-500/[0.14] dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 dark:focus-visible:bg-rose-500/20",
  },
};

/**
 * The four "Como correu?" results as tinted cards (icon and short label). Shared by the dashboard card, the calendar
 * dialog and the in-flow prompt, so all three look and behave the same. Two per row on narrow screens, four on wide.
 */
export function CheckInResultOptions({
  onChoose,
  className = "grid grid-cols-2 gap-2 sm:grid-cols-4",
}: {
  onChoose: (result: CheckInResult) => void;
  className?: string;
}) {
  const t = useTranslations("checkIns");
  const options: { result: CheckInResult; label: string }[] = [
    { result: "TAUGHT", label: t("resultTaught") },
    { result: "TAUGHT_WITH_DIFFICULTIES", label: t("resultDifficulties") },
    { result: "PARTIAL", label: t("resultPartial") },
    { result: "NOT_HELD", label: t("resultNotHeld") },
  ];
  return (
    <div className={className}>
      {options.map((option) => {
        const { icon: Icon, tone } = RESULT_STYLE[option.result];
        return (
          <Button
            key={option.result}
            variant="outline"
            className={cn(
              "h-full min-h-16 flex-col items-start justify-start gap-1.5 whitespace-normal rounded-lg p-3 text-left font-medium shadow-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              tone,
            )}
            onClick={() => onChoose(option.result)}
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-sm leading-snug">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

/**
 * The outcome step for "algumas tiveram dificuldades" and "ficou a meio": the outcomes as checkbox rows, then
 * "Guardar" (saves with whatever is ticked, possibly nothing) and "Voltar". Long outcome texts are clamped to two
 * lines, and the full text is in the row's tooltip.
 */
export function CheckInOutcomeStep({
  question,
  outcomes,
  selected,
  onToggle,
  onSave,
  onBack,
}: {
  question: string;
  outcomes: CheckInOutcome[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("checkIns");
  return (
    <>
      <p className="text-sm font-medium text-foreground">{question}</p>
      <ul role="group" aria-label={question} className="space-y-1.5">
        {outcomes.map((outcome) => {
          const checked = selected.includes(outcome.id);
          return (
            <li key={outcome.id}>
              <label
                title={outcome.text}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent",
                  checked ? "border-primary/50 bg-primary/5" : "bg-card",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(outcome.id)}
                  className="mt-0.5"
                />
                <span className="line-clamp-2 min-w-0 leading-snug">{outcome.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onSave}>
          {t("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
      </div>
    </>
  );
}
