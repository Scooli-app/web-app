"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { computeTotals } from "@/lib/assessment/totals";
import { cn } from "@/shared/utils/utils";
import type { AssessmentDocument } from "@/types/assessment";
import { AlertTriangle, CheckCircle2, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AeChip } from "./AeChip";
import { useAssessmentEditor } from "./context";
import { allExercises, exerciseNumbers } from "./model";

/** "Total: X / Y pts", question count and the AE goals summary. */
/** `trailing` sits at the right end of the first row (the phone "Conversa" button). */
export function TotalsBar({ doc, className, trailing }: { doc: AssessmentDocument; className?: string; trailing?: ReactNode }) {
  const t = useTranslations("assessmentEditor.totals");
  const { aeLookup, showAe } = useAssessmentEditor();
  const { total, target, onTarget } = computeTotals(doc);
  const exercises = allExercises(doc);

  const numbers = exerciseNumbers(doc);
  const byGoal = new Map<string, number[]>();
  for (const e of exercises) for (const id of e.aeOutcomeIds) byGoal.set(id, [...(byGoal.get(id) ?? []), numbers.get(e.id) ?? 0]);
  const goals = [...byGoal.entries()];
  const withoutGoal = exercises.filter((e) => e.aeOutcomeIds.length === 0).length;
  const diff = target === null ? 0 : Math.round((target - total) * 100) / 100;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto]", className)}>
      {target !== null && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium max-md:w-fit max-md:flex-wrap max-md:gap-y-0 max-md:rounded-2xl",
            onTarget ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-200",
          )}
          role="status"
        >
          {onTarget ? <CheckCircle2 className="h-4 w-4" aria-label={t("onTarget")} /> : <AlertTriangle className="h-4 w-4" />}
          <span className="whitespace-nowrap">{t("total", { total, target })}</span>
          {/* Phones: the difference drops under the total, aligned with its text. */}
          {!onTarget && <span className="font-normal max-md:basis-full max-md:pl-[1.375rem] max-md:text-xs"><span className="max-md:hidden">· </span>{diff > 0 ? t("under", { diff }) : t("over", { diff: -diff })}</span>}
        </span>
      )}
      {/* On phones the count and goals drop to a second, smaller row under the total. */}
      <span className="flex items-center gap-x-3 max-md:order-last max-md:col-span-2 max-md:text-xs">
      <span className="text-muted-foreground">{t("questions", { count: exercises.length })}</span>
      {showAe && <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            · {t("goals", { count: goals.length })}
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[min(24rem,calc(100vw-2rem))] p-3">
          <p className="mb-2 text-sm font-semibold">{t("goalsTitle")}</p>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("goalsEmpty")}</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {goals.map(([id, nums]) => (
                <li key={id} className="flex flex-col gap-1">
                  <AeChip outcome={aeLookup[id]} />
                  <span className="pl-1 text-xs text-muted-foreground">{t("goalQuestions", { count: nums.length, numbers: nums.join(", ") })}</span>
                </li>
              ))}
            </ul>
          )}
          {withoutGoal > 0 && <p className="mt-3 border-t border-border pt-2 text-xs text-amber-700 dark:text-amber-300">{t("withoutGoal", { count: withoutGoal })}</p>}
        </PopoverContent>
      </Popover>}
      </span>
      {trailing && <span className="ml-auto">{trailing}</span>}
    </div>
  );
}
