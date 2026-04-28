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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminFeedbackSurveyService, type AdminFeedbackSurveyOverview } from "@/services/api/admin-feedback-survey.service";
import {
  FEEDBACK_SURVEY_SENTIMENT_LABELS,
  FEEDBACK_SURVEY_STATUS_LABELS,
  FEEDBACK_SURVEY_TAG_LABELS,
  FeedbackSurveySentiment,
  FeedbackSurveyStatus,
  type FeedbackSurveyTag,
} from "@/shared/types/feedbackSurvey";
import { cn } from "@/shared/utils/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  MessageSquare,
  RefreshCw,
  ThumbsUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const percentFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 1,
});

const promptStatusChartConfig = {
  count: {
    label: "Utilizadores",
    color: "var(--chart-1)",
  },
  [FeedbackSurveyStatus.PENDING]: {
    label: FEEDBACK_SURVEY_STATUS_LABELS[FeedbackSurveyStatus.PENDING],
    color: "var(--chart-3)",
  },
  [FeedbackSurveyStatus.SNOOZED]: {
    label: FEEDBACK_SURVEY_STATUS_LABELS[FeedbackSurveyStatus.SNOOZED],
    color: "var(--chart-4)",
  },
  [FeedbackSurveyStatus.COMPLETED]: {
    label: FEEDBACK_SURVEY_STATUS_LABELS[FeedbackSurveyStatus.COMPLETED],
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const sentimentChartConfig = {
  count: {
    label: "Respostas",
    color: "var(--chart-1)",
  },
  [FeedbackSurveySentiment.VERY_USEFUL]: {
    label: FEEDBACK_SURVEY_SENTIMENT_LABELS[FeedbackSurveySentiment.VERY_USEFUL],
    color: "var(--chart-2)",
  },
  [FeedbackSurveySentiment.USEFUL_BUT_CAN_IMPROVE]: {
    label:
      FEEDBACK_SURVEY_SENTIMENT_LABELS[
        FeedbackSurveySentiment.USEFUL_BUT_CAN_IMPROVE
      ],
    color: "var(--chart-1)",
  },
  [FeedbackSurveySentiment.NOT_SURE_YET]: {
    label: FEEDBACK_SURVEY_SENTIMENT_LABELS[FeedbackSurveySentiment.NOT_SURE_YET],
    color: "var(--chart-4)",
  },
  [FeedbackSurveySentiment.FRUSTRATING]: {
    label: FEEDBACK_SURVEY_SENTIMENT_LABELS[FeedbackSurveySentiment.FRUSTRATING],
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

const tagChartConfig = {
  count: {
    label: "Menções",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const metricCardClassName =
  "bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70";

function formatPercentage(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function getSentimentLabel(sentiment: string) {
  return FEEDBACK_SURVEY_SENTIMENT_LABELS[
    sentiment as FeedbackSurveySentiment
  ] ?? sentiment;
}

function getPromptStatusLabel(status: string) {
  return FEEDBACK_SURVEY_STATUS_LABELS[status as FeedbackSurveyStatus] ?? status;
}

function getTagLabel(tag: string) {
  return FEEDBACK_SURVEY_TAG_LABELS[tag as FeedbackSurveyTag] ?? tag;
}

function getSentimentBadgeClass(sentiment: string) {
  switch (sentiment as FeedbackSurveySentiment) {
    case FeedbackSurveySentiment.VERY_USEFUL:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case FeedbackSurveySentiment.USEFUL_BUT_CAN_IMPROVE:
      return "border-blue-200 bg-blue-50 text-blue-700";
    case FeedbackSurveySentiment.NOT_SURE_YET:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case FeedbackSurveySentiment.FRUSTRATING:
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function AdminFeedbackSurveyPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminFeedbackSurveyOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);

    try {
      const data = await adminFeedbackSurveyService.getOverview();
      setOverview(data);
    } catch {
      toast.error("Erro ao carregar respostas do survey.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const promptStatusData =
    overview?.promptStatusBreakdown.map((item) => ({
      ...item,
      label: getPromptStatusLabel(item.key),
      fill: `var(--color-${item.key})`,
    })) ?? [];

  const sentimentData =
    overview?.sentimentBreakdown.map((item) => ({
      ...item,
      label: getSentimentLabel(item.key),
      fill: `var(--color-${item.key})`,
    })) ?? [];

  const tagData =
    overview?.tagBreakdown.map((item) => ({
      ...item,
      label: getTagLabel(item.key),
    })) ?? [];

  const responses = overview?.recentResponses ?? [];

  const mobileResponses = (
    <div className="space-y-3">
      {responses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          Ainda não existem respostas ao survey.
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

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "border px-2.5 py-1 text-xs",
                    getSentimentBadgeClass(response.sentiment),
                  )}
                >
                  {getSentimentLabel(response.sentiment)}
                </Badge>
                {response.selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {getTagLabel(tag)}
                  </Badge>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                {response.comment?.trim() || "Sem comentário adicional."}
              </p>
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
            <TableHead>Sentimento</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Comentário</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Ainda não existem respostas ao survey.
              </TableCell>
            </TableRow>
          ) : (
            responses.map((response) => {
              const displayName =
                response.userName || response.userUsername || response.userEmail;

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
                      className={cn(
                        "border px-2.5 py-1 text-xs",
                        getSentimentBadgeClass(response.sentiment),
                      )}
                    >
                      {getSentimentLabel(response.sentiment)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="flex flex-wrap gap-1.5">
                      {response.selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {getTagLabel(tag)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[360px] whitespace-pre-wrap text-sm text-muted-foreground">
                    {response.comment?.trim() || "Sem comentário adicional."}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(response.createdAt), "dd MMM yyyy HH:mm", {
                      locale: pt,
                    })}
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
          title="Survey da App"
          description="Respostas do survey in-app, distribuição de sentimentos e sinais sobre a experiência dos utilizadores."
          icon={<BarChart3 className="h-6 w-6 text-primary" />}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/feedback")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Feedback
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    {overview.summary.totalShownCount} visualizações e{" "}
                    {overview.summary.totalSnoozeCount} adiamentos acumulados
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overview.summary.completed} utilizadores concluíram o survey
                  </p>
                </CardContent>
              </Card>

              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Resposta
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(overview.summary.completionRate)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Entre utilizadores acompanhados pelo prompt
                  </p>
                </CardContent>
              </Card>

              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sentimento Positivo
                  </CardTitle>
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(overview.summary.positiveRate)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Muito útil + útil, mas pode melhorar
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Estados do Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.summary.trackedUsers === 0 ? (
                    <EmptyChartState message="Sem utilizadores acompanhados pelo survey." />
                  ) : (
                    <ChartContainer
                      config={promptStatusChartConfig}
                      className="aspect-auto h-[280px]"
                    >
                      <BarChart data={promptStatusData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="count" radius={10}>
                          {promptStatusData.map((item) => (
                            <Cell key={item.key} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Sentimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.summary.responses === 0 ? (
                    <EmptyChartState message="Sem respostas submetidas ao survey." />
                  ) : (
                    <ChartContainer
                      config={sentimentChartConfig}
                      className="aspect-auto h-[280px]"
                    >
                      <BarChart data={sentimentData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          interval={0}
                          angle={-12}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="count" radius={10}>
                          {sentimentData.map((item) => (
                            <Cell key={item.key} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tags Mais Referidas</CardTitle>
              </CardHeader>
              <CardContent>
                {tagData.length === 0 ? (
                  <EmptyChartState message="Ainda não existem tags suficientes para mostrar." />
                ) : (
                  <ChartContainer
                    config={tagChartConfig}
                    className="aspect-auto h-[320px]"
                  >
                    <BarChart data={tagData} layout="vertical" margin={{ left: 36 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="label"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={170}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar dataKey="count" fill="var(--color-count)" radius={10} />
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
            Não foi possível carregar os dados do survey.
          </div>
        )}
      </div>
    </PageContainer>
  );
}
