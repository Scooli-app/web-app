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
} from "@/services/api/admin-onboarding.service";
import {
  ACQUISITION_SOURCE_LABELS,
  SUBJECT_AREA_LABELS,
  TEACHING_LEVEL_LABELS,
  type AcquisitionSource,
  type SubjectArea,
  type TeachingLevel,
} from "@/shared/types/onboarding";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOnboardingOverview | null>(null);
  const [loading, setLoading] = useState(true);

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

  const responses = overview?.recentResponses ?? [];

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
                {response.subjectArea && (
                  <Badge variant="secondary" className="text-xs">
                    {getSubjectLabel(response.subjectArea)}
                  </Badge>
                )}
                {response.teachingLevel && (
                  <Badge variant="secondary" className="text-xs">
                    {getLevelLabel(response.teachingLevel)}
                  </Badge>
                )}
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
            <TableHead>Utilizador</TableHead>
            <TableHead>Como nos encontrou</TableHead>
            <TableHead>Disciplina</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
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
                  <TableCell className="text-sm text-muted-foreground">
                    {response.subjectArea
                      ? getSubjectLabel(response.subjectArea)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {response.teachingLevel
                      ? getLevelLabel(response.teachingLevel)
                      : "—"}
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
