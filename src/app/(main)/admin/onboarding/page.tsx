"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminOnboardingService,
  type AdminOnboardingOverview,
  type AdminOnboardingResponse,
} from "@/services/api/admin-onboarding.service";
import {
  ACQUISITION_SOURCE_LABELS,
  ONBOARDING_GOAL_LABELS,
  SUBJECT_AREA_LABELS,
  TEACHING_LEVEL_LABELS,
  type AcquisitionSource,
  type OnboardingGoal,
  type SubjectArea,
  type TeachingLevel,
} from "@/shared/types/onboarding";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const percentFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 1,
});

const acquisitionChartConfig = {
  count: { label: "Respostas", color: "var(--chart-1)" },
} satisfies ChartConfig;

const subjectChartConfig = {
  count: { label: "Respostas", color: "var(--chart-2)" },
} satisfies ChartConfig;

const levelChartConfig = {
  count: { label: "Respostas", color: "var(--chart-3)" },
} satisfies ChartConfig;

const goalsChartConfig = {
  count: { label: "Respostas", color: "var(--chart-4)" },
} satisfies ChartConfig;

const metricCardClassName =
  "bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70";

function formatPercentage(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function getAcquisitionLabel(key: string) {
  return ACQUISITION_SOURCE_LABELS[key as AcquisitionSource] ?? key;
}

function getSubjectLabel(key: string) {
  return SUBJECT_AREA_LABELS[key as SubjectArea] ?? key;
}

function getLevelLabel(key: string) {
  return TEACHING_LEVEL_LABELS[key as TeachingLevel] ?? key;
}

function getGoalLabel(key: string) {
  return ONBOARDING_GOAL_LABELS[key as OnboardingGoal] ?? key;
}

function parseCommaSeparated(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

type SortField = "user" | "source" | "date";
type SortDir = "asc" | "desc";

function SortableHead({
  field,
  label,
  current,
  dir,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}

function sortResponses(
  responses: AdminOnboardingResponse[],
  field: SortField,
  dir: SortDir,
): AdminOnboardingResponse[] {
  return [...responses].sort((a, b) => {
    let cmp = 0;
    if (field === "user") {
      const nameA = (a.userName || a.userUsername || a.userEmail).toLowerCase();
      const nameB = (b.userName || b.userUsername || b.userEmail).toLowerCase();
      cmp = nameA.localeCompare(nameB);
    } else if (field === "source") {
      cmp = a.acquisitionSource.localeCompare(b.acquisitionSource);
    } else if (field === "date") {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOnboardingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminOnboardingService.getOverview();
      setOverview(data);
    } catch {
      toast.error("Erro ao carregar dados do onboarding.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const acquisitionData =
    overview?.acquisitionSourceBreakdown.map((item) => ({
      ...item,
      label: getAcquisitionLabel(item.key),
    })) ?? [];

  const subjectData =
    overview?.subjectAreaBreakdown.map((item) => ({
      ...item,
      label: getSubjectLabel(item.key),
    })) ?? [];

  const levelData =
    overview?.teachingLevelBreakdown.map((item) => ({
      ...item,
      label: getLevelLabel(item.key),
    })) ?? [];

  const goalsData =
    overview?.goalsBreakdown?.map((item) => ({
      ...item,
      label: getGoalLabel(item.key),
    })) ?? [];


  const responses = useMemo(
    () => sortResponses(overview?.recentResponses ?? [], sortField, sortDir),
    [overview?.recentResponses, sortField, sortDir],
  );

  const mobileResponses = (
    <div className="space-y-3">
      {responses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          Ainda não existem respostas ao onboarding.
        </div>
      ) : (
        responses.map((response) => {
          const displayName =
            response.userName || response.userUsername || response.userEmail;
          const subjects = parseCommaSeparated(response.subjectArea);
          const levels = parseCommaSeparated(response.teachingLevel);
          const goals = parseCommaSeparated(response.goals);
          return (
            <div
              key={response.id}
              className="rounded-xl border border-border/70 bg-card/80 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {response.userEmail}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format(new Date(response.createdAt), "dd MMM yyyy", {
                    locale: pt,
                  })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/8 text-primary text-xs">
                  {getAcquisitionLabel(response.acquisitionSource)}
                </Badge>
                {subjects.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {getSubjectLabel(s)}
                  </Badge>
                ))}
                {levels.map((l) => (
                  <Badge key={l} variant="secondary" className="text-xs">
                    {getLevelLabel(l)}
                  </Badge>
                ))}
                {goals.map((g) => (
                  <Badge key={g} variant="outline" className="border-violet-400/30 bg-violet-400/8 text-xs text-violet-700 dark:text-violet-300">
                    {getGoalLabel(g)}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const desktopResponses = (
    <div className="rounded-xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead field="user" label="Utilizador" current={sortField} dir={sortDir} onSort={handleSort} />
            <SortableHead field="source" label="Como nos encontrou" current={sortField} dir={sortDir} onSort={handleSort} />
            <TableHead>Disciplina</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Objetivos</TableHead>
            <SortableHead field="date" label="Data" current={sortField} dir={sortDir} onSort={handleSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Ainda não existem respostas ao onboarding.
              </TableCell>
            </TableRow>
          ) : (
            responses.map((response) => {
              const displayName =
                response.userName ||
                response.userUsername ||
                response.userEmail;
              const subjects = parseCommaSeparated(response.subjectArea);
              const levels = parseCommaSeparated(response.teachingLevel);
              const goals = parseCommaSeparated(response.goals);
              return (
                <TableRow key={response.id}>
                  <TableCell className="max-w-[220px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {response.userEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-primary/20 bg-primary/8 text-primary text-xs"
                    >
                      {getAcquisitionLabel(response.acquisitionSource)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {subjects.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {subjects.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {getSubjectLabel(s)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {levels.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {levels.map((l) => (
                          <Badge key={l} variant="secondary" className="text-xs">
                            {getLevelLabel(l)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {goals.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {goals.map((g) => (
                          <Badge
                            key={g}
                            variant="outline"
                            className="border-violet-400/30 bg-violet-400/8 text-xs text-violet-700 dark:text-violet-300"
                          >
                            {getGoalLabel(g)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(
                      new Date(response.createdAt),
                      "dd MMM yyyy HH:mm",
                      { locale: pt },
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <PageContainer size="7xl" contentClassName="py-4 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Onboarding"
          description="Respostas do onboarding de novos utilizadores — fontes de aquisição, disciplinas e níveis de ensino."
          icon={<MapPin className="h-6 w-6 text-primary" />}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button variant="outline" size="sm" onClick={loadOverview}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </>
          }
        />

        {loading && !overview ? (
          <div className="flex min-h-[40dvh] items-center justify-center rounded-2xl border border-border/70 bg-card/60">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : overview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Utilizadores Acompanhados
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overview.summary.trackedUsers}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overview.summary.completed} completaram o onboarding
                  </p>
                </CardContent>
              </Card>

              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Respostas Recebidas
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overview.summary.responses}
                  </div>
                </CardContent>
              </Card>

              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Conclusão
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(overview.summary.completionRate)}
                  </div>
                  {overview.summary.topAcquisitionSource && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Fonte principal:{" "}
                      {getAcquisitionLabel(overview.summary.topAcquisitionSource)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Como nos Encontraram</CardTitle>
              </CardHeader>
              <CardContent>
                {acquisitionData.length === 0 ? (
                  <EmptyChartState message="Ainda não existem respostas." />
                ) : (
                  <ChartContainer
                    config={acquisitionChartConfig}
                    className="aspect-auto h-[280px]"
                  >
                    <BarChart data={acquisitionData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        interval={0}
                        angle={-10}
                        textAnchor="end"
                        height={55}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        radius={10}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Disciplina</CardTitle>
                </CardHeader>
                <CardContent>
                  {subjectData.length === 0 ? (
                    <EmptyChartState message="Nenhuma disciplina registada ainda." />
                  ) : (
                    <ChartContainer
                      config={subjectChartConfig}
                      className="aspect-auto h-[260px]"
                    >
                      <BarChart data={subjectData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          dataKey="label"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          width={100}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar
                          dataKey="count"
                          fill="var(--color-count)"
                          radius={10}
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nível de Ensino</CardTitle>
                </CardHeader>
                <CardContent>
                  {levelData.length === 0 ? (
                    <EmptyChartState message="Nenhum nível de ensino registado ainda." />
                  ) : (
                    <ChartContainer
                      config={levelChartConfig}
                      className="aspect-auto h-[260px]"
                    >
                      <BarChart data={levelData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar
                          dataKey="count"
                          fill="var(--color-count)"
                          radius={10}
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>O que Procuram na Scooli</CardTitle>
              </CardHeader>
              <CardContent>
                {goalsData.length === 0 ? (
                  <EmptyChartState message="Nenhum objetivo registado ainda." />
                ) : (
                  <ChartContainer
                    config={goalsChartConfig}
                    className="aspect-auto h-[280px]"
                  >
                    <BarChart data={goalsData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="label"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={180}
                        tick={{ fontSize: 12 }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        radius={10}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Respostas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveDataView
                  mobileCardView={mobileResponses}
                  desktopTableView={desktopResponses}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            Não foi possível carregar os dados do onboarding.
          </div>
        )}
      </div>
    </PageContainer>
  );
}
