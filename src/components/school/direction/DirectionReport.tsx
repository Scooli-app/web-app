"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionLearning, getDirectionOverview } from "@/services/api/school-direction.service";
import type { DirectionLearning, DirectionOverview } from "@/shared/types/school-direction";
import { cn } from "@/shared/utils/utils";
import { useAppSelector } from "@/store/hooks";
import { selectWorkspaceContext } from "@/store/workspace/selectors";
import { FileText, Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { departmentExecution, formatClass, formatDay, formatSubject } from "./format";
import { STATE_CLASSES } from "./StatePill";

// The sheet is white paper whatever the theme, so the class-state colours are the light ones (as in globals.css :root).
const LIGHT_STATE_TOKENS = {
  "--color-direction-ok": "#0B7A5A",
  "--color-direction-ok-bg": "#E7F7F1",
  "--color-direction-watch": "#8A5A00",
  "--color-direction-watch-bg": "#FDF4E3",
  "--color-direction-late": "#B3362B",
  "--color-direction-late-bg": "#FCEBEA",
  "--color-direction-idle": "#475569",
  "--color-direction-idle-bg": "#F1F5F9",
} as CSSProperties;

// Printing is light too: no dark page behind the sheet, and the sheet's own margins come from the page.
const PRINT_CSS = `
@page { margin: 14mm; }
@media print { html, body, main { background: #fff !important; } }
`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9 break-inside-avoid">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Sheet({ overview, learning }: { overview: DirectionOverview; learning: DirectionLearning }) {
  const t = useTranslations("schoolDirection");
  const tSchool = useTranslations("school");
  const locale = useLocale();
  const workspace = useAppSelector(selectWorkspaceContext);
  const departments = departmentExecution(overview.turmas);
  // Most lessons behind first: that puts the red classes before the amber ones.
  const toFollow = overview.turmas
    .filter((turma) => turma.state === "watch" || turma.state === "behind")
    .sort((a, b) => b.lessonsBehind - a.lessonsBehind);
  const audience = t("reports.audience");

  return (
    <article
      aria-label={t("reports.sheetTitle")}
      style={LIGHT_STATE_TOKENS}
      className={cn(
        "mx-auto w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm sm:min-h-[297mm] sm:p-12",
        // Colours and bars are backgrounds: ask the printer to keep them.
        "[-webkit-print-color-adjust:exact] [print-color-adjust:exact]",
        "print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none",
      )}
    >
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          {workspace?.organization?.name ?? tSchool("common.fallbackName")}
        </p>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">{t("reports.sheetTitle")}</h2>
        {overview.schoolYearLabel && (
          <p className="mt-1 text-slate-600">{t("reports.sheetYear", { label: overview.schoolYearLabel })}</p>
        )}
        <p className="mt-4 text-sm text-slate-600">
          {audience && <span className="block">{audience}</span>}
          <span className="block">{t("reports.generated", { date: formatDay(overview.asOf, locale, true) })}</span>
        </p>
      </header>

      <Section title={t("reports.byDepartment")}>
        {departments.length === 0 ? (
          <p className="text-sm text-slate-600">{t("reports.byDepartmentEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {departments.map(({ department, percent }) => (
              <li key={department}>
                <p className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0">{t(`departments.${department}`)}</span>
                  <span className="font-semibold tabular-nums">{percent}%</span>
                </p>
                <div aria-hidden className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("reports.followUp")}>
        {toFollow.length === 0 ? (
          <p className="text-sm text-slate-600">{t("reports.followUpEmpty")}</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {toFollow.map((turma) => (
              <li key={turma.id} className="flex items-start gap-3 break-inside-avoid py-2.5 text-sm">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
                    STATE_CLASSES[turma.state],
                  )}
                >
                  {turma.executionPercent === null ? "—" : `${turma.executionPercent}%`}
                </span>
                <span className="min-w-0">
                  {[
                    formatClass(turma.grade, turma.classLabel, locale),
                    formatSubject(turma.subjectKey, turma.subjectLabel),
                    t("states.lessonsBehind", { count: turma.lessonsBehind }),
                    turma.behindTopic,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("reports.reinforce")}>
        {learning.items.length === 0 ? (
          <p className="text-sm text-slate-600">{t("learning.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {learning.items.slice(0, 5).map((item) => (
              <li key={item.outcomeId} className="break-inside-avoid py-2.5">
                <p className="text-sm font-medium">{item.text}</p>
                <p className="text-sm text-slate-600">
                  {t("learning.summary", {
                    subject: formatSubject(item.subjectKey, item.subjectLabel),
                    grade: item.grade,
                    flagged: item.turmasFlagged,
                    total: item.turmasTotal,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </article>
  );
}

/** The curriculum progress report for the school, as one sheet that prints (or saves) as a PDF. */
export function DirectionReport() {
  const t = useTranslations("schoolDirection");
  const [data, setData] = useState<{ overview: DirectionOverview; learning: DirectionLearning } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([getDirectionOverview(), getDirectionLearning()]).then(
      ([overview, learning]) => {
        if (!cancelled) setData({ overview, learning });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const hasTurmas = (data?.overview.turmas.length ?? 0) > 0;
  const label = data?.overview.schoolYearLabel;

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8 print:p-0">
      <style>{PRINT_CSS}</style>
      <PageHeader
        className="print:hidden"
        title={t("reports.title")}
        description={
          data ? (label ? t("reports.subtitle", { label }) : t("reports.subtitleNoYear")) : undefined
        }
        actions={
          <Button type="button" disabled={!hasTurmas} onClick={() => window.print()}>
            <Printer aria-hidden />
            {t("reports.export")}
          </Button>
        }
      />

      {failed ? (
        <LoadError className="print:hidden" onRetry={() => setAttempt((n) => n + 1)} />
      ) : !data ? (
        <Skeleton className="mx-auto h-[36rem] w-full max-w-[210mm] rounded-xl" />
      ) : !hasTurmas ? (
        <EmptyState icon={FileText} title={t("dashboard.emptyTitle")} description={t("dashboard.empty")} />
      ) : (
        <Sheet overview={data.overview} learning={data.learning} />
      )}
    </PageContainer>
  );
}
