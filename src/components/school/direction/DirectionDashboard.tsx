"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionOverview } from "@/services/api/school-direction.service";
import type { Department, DirectionOverview } from "@/shared/types/school-direction";
import { cn } from "@/shared/utils/utils";
import { LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { coverageCounts } from "./coverage";
import { DirectionGrid, GridLegend } from "./DirectionGrid";
import { DEPARTMENTS } from "./format";
import { TurmaDrawer } from "./TurmaDrawer";

function CountCard({ label, dot, count }: { label: string; dot: string; count: number }) {
  const t = useTranslations("schoolDirection.kpis");
  return (
    <Card className="gap-0 px-5 py-5">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dot)} />
        {label}
      </p>
      <p className="mt-1.5 text-4xl font-semibold tracking-tight tabular-nums text-foreground">{count}</p>
      <p className="text-sm text-muted-foreground">{t("classes", { count })}</p>
    </Card>
  );
}

function Overview({ overview }: { overview: DirectionOverview }) {
  const t = useTranslations("schoolDirection");
  const [year, setYear] = useState<number | null>(null);
  const [department, setDepartment] = useState<Department | "all">("all");
  const [openTurmaId, setOpenTurmaId] = useState<string | null>(null);
  const { counts, executionPercent } = overview;
  const departments = DEPARTMENTS.filter((d) => overview.turmas.some((turma) => turma.department === d));
  const turmas = overview.turmas.filter(
    (turma) => (year === null || turma.grade === year) && (department === "all" || turma.department === department),
  );

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:gap-4",
          counts.noRecords > 0 ? "lg:grid-cols-[1.4fr_repeat(4,1fr)]" : "lg:grid-cols-[1.4fr_repeat(3,1fr)]",
        )}
      >
        <Card className="col-span-2 gap-0 px-5 py-5 lg:col-span-1">
          <p className="text-sm text-muted-foreground">{t("kpis.execution")}</p>
          <p className="mt-1.5 text-4xl font-semibold tracking-tight tabular-nums text-foreground">
            {executionPercent === null ? "—" : `${executionPercent}%`}
          </p>
          <p className="text-sm text-muted-foreground">{t("kpis.executionHint")}</p>
          <div aria-hidden className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${executionPercent ?? 0}%` }} />
          </div>
        </Card>
        <CountCard label={t("kpis.onTrack")} dot="bg-direction-ok" count={counts.onTrack} />
        <CountCard label={t("kpis.watch")} dot="bg-direction-watch" count={counts.watch} />
        <CountCard label={t("kpis.behind")} dot="bg-direction-late" count={counts.behind} />
        {counts.noRecords > 0 && (
          <CountCard label={t("kpis.noRecords")} dot="bg-direction-idle" count={counts.noRecords} />
        )}
      </div>

      <Card className="mt-4 gap-4 px-4 py-5 sm:mt-6 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h2 className="text-base font-semibold text-foreground">{t("grid.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("grid.subtitle")}</p>
          <GridLegend className="sm:ml-auto" />
        </div>

        {/* Filters narrow the grid only; the figures above are the whole school. */}
        <div className="flex flex-wrap items-center gap-2">
          <ChoiceChip selected={year === null} onClick={() => setYear(null)}>
            {t("grid.allYears")}
          </ChoiceChip>
          {overview.years.map((grade) => (
            <ChoiceChip key={grade} selected={year === grade} onClick={() => setYear(grade)}>
              {t("grid.year", { grade })}
            </ChoiceChip>
          ))}
          <Select value={department} onValueChange={(value) => setDepartment(value as Department | "all")}>
            <SelectTrigger aria-label={t("grid.department")} className="h-8 w-auto gap-2 sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("grid.allDepartments")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`departments.${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {turmas.length > 0 ? (
          <DirectionGrid turmas={turmas} subjects={overview.subjects} onOpen={setOpenTurmaId} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("grid.noMatch")}</p>
        )}
      </Card>

      <TurmaDrawer turmaId={openTurmaId} onClose={() => setOpenTurmaId(null)} />
    </>
  );
}

/** The direction's home: how far each class is through what was planned, never a ranking of teachers. */
export function DirectionDashboard() {
  const t = useTranslations("schoolDirection");
  const [overview, setOverview] = useState<DirectionOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    getDirectionOverview().then(
      (data) => {
        if (!cancelled) setOverview(data);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const subtitle = overview
    ? overview.schoolYearLabel
      ? t("dashboard.subtitle", { year: overview.schoolYearLabel })
      : t("dashboard.subtitleNoYear")
    : undefined;
  // Directors doubted the numbers when nothing said which turmas and teachers they come from.
  const description =
    overview && overview.turmas.length > 0 ? (
      <>
        {subtitle}
        <span className="block">{t("dashboard.coverage", coverageCounts(overview.turmas))}</span>
      </>
    ) : (
      subtitle
    );

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader title={t("dashboard.title")} description={description} />

      {failed ? (
        <LoadError onRetry={() => setAttempt((n) => n + 1)} />
      ) : !overview ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className={cn("h-36 rounded-xl", i === 0 && "col-span-2 lg:col-span-1")} />
            ))}
          </div>
          <Skeleton className="mt-4 h-96 rounded-xl sm:mt-6" />
        </>
      ) : overview.turmas.length === 0 ? (
        <EmptyState icon={LayoutGrid} title={t("dashboard.emptyTitle")} description={t("dashboard.empty")} />
      ) : (
        <Overview overview={overview} />
      )}
    </PageContainer>
  );
}
