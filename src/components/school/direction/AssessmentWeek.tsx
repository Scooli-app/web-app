"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/locales";
import { getDirectionAssessments } from "@/services/api/school-direction.service";
import type { DirectionAssessmentClass, DirectionAssessmentWeek } from "@/shared/types/school-direction";
import { addDays, getDayLabels, toIso } from "@/shared/utils/calendar";
import { cn } from "@/shared/utils/utils";
import { AlertTriangle, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { formatClass, formatDay, formatDayRange, formatSubject } from "./format";
import { TeacherContact } from "./TeacherContact";
import { TurmaDrawer } from "./TurmaDrawer";

const classKey = (c: DirectionAssessmentClass) => `${c.grade}|${c.classLabel}`;

/** The same tint in a sticky cell, laid over the opaque card so scrolled cells don't show through. */
const CLASH_STICKY_BG = "bg-card bg-[image:linear-gradient(var(--direction-watch-bg),var(--direction-watch-bg))]";

/** One class that has too many tests this week: what, when and who to talk to. No action: it is for the direction to raise. */
function ClashBanner({ clash }: { clash: DirectionAssessmentClass }) {
  const t = useTranslations("schoolDirection.assessments");
  const locale = useLocale();
  // A teacher with two of the tests is still one contact.
  const teachers = [...new Map(clash.assessments.map((a) => [a.teacher.userId, a.teacher])).values()];

  return (
    <div className="flex gap-3 rounded-xl bg-direction-watch-bg px-4 py-3 text-direction-watch">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">
          {t("clash", { class: formatClass(clash.grade, clash.classLabel, locale), n: clash.assessments.length })}
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
          {clash.assessments.map((a) => (
            <li key={a.slotId}>
              {formatSubject(a.subjectLabel, a.subjectLabel)} · {formatDay(a.date, locale)}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-foreground">
          <span className="text-muted-foreground">{t("teachers")}</span>
          {teachers.map((teacher) => (
            <TeacherContact key={teacher.userId} teacher={teacher} />
          ))}
        </p>
      </div>
    </div>
  );
}

interface WeekGridProps {
  week: DirectionAssessmentWeek;
  classes: DirectionAssessmentClass[];
  clashKeys: Set<string>;
  onOpen: (turmaId: string) => void;
}

/** Classes × Monday to Friday. A class that clashes gets the amber row. */
function WeekGrid({ week, classes, clashKeys, onOpen }: WeekGridProps) {
  const t = useTranslations("schoolDirection.assessments");
  const tGrid = useTranslations("schoolDirection.grid");
  const locale = useLocale();
  const monday = new Date(`${week.weekStart}T00:00:00`);
  const days = getDayLabels(locale as Locale)
    .slice(0, 5)
    .map((label, i) => ({ label, date: addDays(monday, i) }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-card">
              <span className="sr-only">{tGrid("classColumn")}</span>
            </th>
            {days.map(({ label, date }) => (
              <th key={label} scope="col" className="min-w-36 px-2 py-2 text-center text-xs font-normal text-muted-foreground">
                {label} {date.getDate()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map((row) => {
            const clash = clashKeys.has(classKey(row));
            const classText = formatClass(row.grade, row.classLabel, locale);
            return (
              <tr key={classKey(row)} className={cn("border-t border-border", clash && "bg-direction-watch-bg")}>
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 max-w-32 whitespace-nowrap px-3 py-3 text-left align-top font-semibold text-foreground sm:max-w-48",
                    clash ? CLASH_STICKY_BG : "bg-card",
                  )}
                >
                  {/* A clash is also said in words, so the amber is never the only sign of it. */}
                  <span aria-hidden={clash}>{classText}</span>
                  {clash && (
                    <>
                      <AlertTriangle aria-hidden className="ml-1.5 inline size-3.5 align-text-top text-direction-watch" />
                      <span className="sr-only">{t("clash", { class: classText, n: row.assessments.length })}</span>
                    </>
                  )}
                </th>
                {days.map(({ label, date }) => {
                  const iso = toIso(date);
                  return (
                    <td key={label} className="p-1.5 align-top">
                      <div className="flex flex-col gap-1">
                        {row.assessments
                          .filter((a) => a.date === iso)
                          .map((a) => {
                            // The assessment carries only the subject as typed; formatSubject translates the known ones.
                            const text = t("test", { subject: formatSubject(a.subjectLabel, a.subjectLabel) });
                            return (
                              <button
                                key={a.slotId}
                                type="button"
                                onClick={() => onOpen(a.turmaId)}
                                title={a.topicTitle ?? undefined}
                                aria-label={[classText, text, a.topicTitle].filter(Boolean).join(" · ")}
                                className={cn(
                                  "w-full rounded-md border px-2 py-1 text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  clash
                                    ? "border-direction-watch bg-card text-direction-watch"
                                    : "border-transparent bg-primary/10 text-primary hover:bg-primary/15",
                                )}
                              >
                                {text}
                              </button>
                            );
                          })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Week({
  week,
  year,
  onYear,
  onOpen,
}: {
  week: DirectionAssessmentWeek;
  year: number | null;
  onYear: (grade: number | null) => void;
  onOpen: (turmaId: string) => void;
}) {
  const t = useTranslations("schoolDirection");
  const years = [...new Set(week.classes.map((c) => c.grade))].sort((a, b) => a - b);
  const inYear = (c: DirectionAssessmentClass) => year === null || c.grade === year;
  const classes = week.classes.filter(inYear);
  const clashes = week.clashes.filter(inYear);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ChoiceChip showCheck selected={year === null} onClick={() => onYear(null)}>
          {t("grid.allYears")}
        </ChoiceChip>
        {years.map((grade) => (
          <ChoiceChip key={grade} showCheck selected={year === grade} onClick={() => onYear(grade)}>
            {t("grid.year", { grade })}
          </ChoiceChip>
        ))}
      </div>

      {clashes.length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          {clashes.map((clash) => (
            <ClashBanner key={classKey(clash)} clash={clash} />
          ))}
        </div>
      )}

      <Card className="gap-0 overflow-hidden p-0">
        <WeekGrid week={week} classes={classes} clashKeys={new Set(clashes.map(classKey))} onOpen={onOpen} />
      </Card>
    </>
  );
}

/** A week of tests per class, Monday to Friday, with the classes that have too many flagged. */
export function AssessmentWeek() {
  const t = useTranslations("schoolDirection.assessments");
  const locale = useLocale();
  // Undefined until a neighbouring week is asked for: the first load lets the backend pick the week.
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const [week, setWeek] = useState<DirectionAssessmentWeek | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [year, setYear] = useState<number | null>(null);
  const [openTurmaId, setOpenTurmaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setWeek(null);
    setFailed(false);
    getDirectionAssessments(weekStart).then(
      (data) => {
        if (!cancelled) setWeek(data);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [weekStart, attempt]);

  // The Monday we are on, known even while the next one loads, so the buttons keep working after a failed load.
  const current = weekStart ?? week?.weekStart;
  const go = (days: number) => current && setWeekStart(toIso(addDays(new Date(`${current}T00:00:00`), days)));

  // A year chosen for one week may not exist in the next: then show them all, as the chips do.
  const activeYear = week && week.classes.some((c) => c.grade === year) ? year : null;
  const range = week ? formatDayRange(week.weekStart, week.weekEnd, locale) : "";

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={t("title")}
        description={
          week ? (activeYear === null ? t("subtitle", { range }) : t("subtitleYear", { range, grade: activeYear })) : undefined
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" disabled={!current} onClick={() => go(-7)}>
              <ChevronLeft aria-hidden />
              {t("previous")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!current} onClick={() => go(7)}>
              {t("next")}
              <ChevronRight aria-hidden />
            </Button>
          </>
        }
      />

      {failed ? (
        <LoadError onRetry={() => setAttempt((n) => n + 1)} />
      ) : !week ? (
        <>
          <Skeleton className="mb-4 h-9 w-64 max-w-full rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
        </>
      ) : week.classes.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={t("empty")} />
      ) : (
        <Week week={week} year={activeYear} onYear={setYear} onOpen={setOpenTurmaId} />
      )}

      <TurmaDrawer turmaId={openTurmaId} onClose={() => setOpenTurmaId(null)} />
    </PageContainer>
  );
}
