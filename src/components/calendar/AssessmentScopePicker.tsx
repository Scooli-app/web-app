"use client";

import { ChoiceChip } from "@/components/ui/choice-chip";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import type { AssessmentScope } from "@/services/api/timetable.service";
import { toIntlLocale } from "@/shared/utils/calendar";
import { useLocale, useTranslations } from "next-intl";
import { testBlocked } from "./assessmentScopeLogic";

interface AssessmentScopePickerProps {
  scope: AssessmentScope;
  selected: readonly string[];
  onToggle: (id: string) => void;
}

/**
 * "Vai avaliar" (ENG-209): the outcomes the test will assess, all ticked to begin with. Shown on an assessment before
 * its test is created; the ticked ones are sent with the request.
 */
export function AssessmentScopePicker({ scope, selected, onToggle }: AssessmentScopePickerProps) {
  const t = useTranslations("calendar.assessmentScope");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;

  const since = scope.fromDate
    ? t("since", {
        date: new Date(`${scope.fromDate}T00:00:00`).toLocaleDateString(toIntlLocale(locale), {
          day: "numeric",
          month: "long",
        }),
      })
    : t("sinceStart");

  return (
    <section aria-label={t("title")} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{since}</p>
      </div>

      {scope.outcomes.length === 0 ? (
        <p className="text-sm italic text-muted-foreground/70">{t("empty")}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("title")}>
            {scope.outcomes.map((outcome) => (
              <ChoiceChip
                key={outcome.id}
                selected={selected.includes(outcome.id)}
                showCheck
                title={outcome.topicPath.join(" › ")}
                onClick={() => onToggle(outcome.id)}
                trailing={
                  <>
                    <span className="text-[10px] opacity-70">{t("lessons", { count: outcome.lessons })}</span>
                    {outcome.evidence === "assumed" && (
                      <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {t("notConfirmed")}
                      </span>
                    )}
                  </>
                }
              >
                {outcome.text}
              </ChoiceChip>
            ))}
          </div>
          {testBlocked(scope, selected) && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{t("pickAtLeastOne")}</p>
          )}
        </>
      )}
    </section>
  );
}
