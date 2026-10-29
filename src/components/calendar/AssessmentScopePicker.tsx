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
 * "Vai avaliar" (ENG-209): the lessons the test covers, then the outcomes it will assess, all ticked to begin with.
 * Shown on an assessment before its test is created; the ticked outcomes are sent with the request. Lessons still
 * ahead of the test are listed too ("por dar"), so a test a few weeks out already shows what it will cover.
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
  const lessons = scope.lessons ?? [];
  const shortDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(toIntlLocale(locale), { day: "numeric", month: "short" });

  return (
    <section aria-label={t("title")} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{since}</p>
      </div>

      {lessons.length > 0 && (
        <ol aria-label={t("lessonsTitle")} className="space-y-0.5">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex items-baseline gap-2 text-sm">
              <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">{shortDate(lesson.date)}</span>
              <span className="min-w-0 flex-1 truncate" title={lesson.topicTitle ?? undefined}>
                {lesson.topicTitle || <span className="italic text-muted-foreground">{t("untitledLesson")}</span>}
              </span>
              {lesson.teachingStatus === "planned" && (
                <span className="shrink-0 text-[10px] text-muted-foreground">{t("plannedLesson")}</span>
              )}
            </li>
          ))}
        </ol>
      )}
      {scope.outcomes.length === 0 ? (
        <p className="text-sm italic text-muted-foreground/70">{t(lessons.length > 0 ? "outcomesPending" : "empty")}</p>
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
                      // Solid in both themes: on a selected (filled) chip a translucent badge lost its contrast.
                      <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-900">
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
            // A how-to, not an error: nothing is wrong before the teacher has chosen.
            <p className="text-xs text-muted-foreground">{t("pickAtLeastOne")}</p>
          )}
        </>
      )}
    </section>
  );
}
