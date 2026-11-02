"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useDateFnsLocale } from "@/i18n/dateFns";
import type { AdminOnboardingResponse } from "@/services/api/admin-onboarding.service";
import {
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  getAcquisitionLabel,
  getGoalLabel,
  getLevelLabel,
  getSubjectLabel,
  getYearCycle,
  parseCommaSeparated,
} from "./labels";

type Dimension = "total" | "source" | "subject" | "level" | "goal";
type Period = "week" | "month";

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "source", label: "Fonte" },
  { key: "subject", label: "Disciplina" },
  { key: "level", label: "Ciclo" },
  { key: "goal", label: "Objetivo" },
];

/** Fixed series order; anything past the top 4 folds into "Outros" (neutral). */
const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const OTHER_COLOR = "var(--muted-foreground)";
const MAX_SERIES = SERIES_COLORS.length;

function valuesOf(response: AdminOnboardingResponse, dimension: Dimension): string[] {
  switch (dimension) {
    case "total":
      return ["Respostas"];
    case "source":
      return response.acquisitionSource ? [getAcquisitionLabel(response.acquisitionSource)] : [];
    case "subject":
      return [...new Set(parseCommaSeparated(response.subjectArea).map(getSubjectLabel))];
    case "level":
      return [
        ...new Set(
          parseCommaSeparated(response.teachingLevel).map((l) => getLevelLabel(getYearCycle(l) ?? l)),
        ),
      ];
    case "goal":
      return parseCommaSeparated(response.goals).map(getGoalLabel);
  }
}

/** Onboarding answers per week or month, optionally split by one answer. */
export function OnboardingTimeline({ responses }: { responses: AdminOnboardingResponse[] }) {
  const locale = useDateFnsLocale();
  const [dimension, setDimension] = useState<Dimension>("total");
  const [period, setPeriod] = useState<Period>("week");

  const { data, series, config } = useMemo(() => {
    const now = new Date();
    const bucketOf = (d: Date) =>
      period === "week" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d);
    const buckets =
      period === "week"
        ? eachWeekOfInterval({ start: subWeeks(now, 25), end: now }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    const first = buckets[0].getTime();

    const totals = new Map<string, number>();
    const counts = new Map<number, Map<string, number>>();
    for (const response of responses) {
      const bucket = bucketOf(new Date(response.createdAt)).getTime();
      if (bucket < first) continue;
      for (const value of valuesOf(response, dimension)) {
        totals.set(value, (totals.get(value) ?? 0) + 1);
        const row = counts.get(bucket) ?? new Map<string, number>();
        row.set(value, (row.get(value) ?? 0) + 1);
        counts.set(bucket, row);
      }
    }

    // Top values keep their own colour; ranking is over the whole window so colours don't shift by bar.
    const ranked = [...totals].sort((a, b) => b[1] - a[1]).map(([v]) => v);
    const top = ranked.slice(0, MAX_SERIES);
    const hasOther = ranked.length > MAX_SERIES;
    const seriesList = [
      ...top.map((label, i) => ({ key: `s${i}`, label, color: SERIES_COLORS[i] })),
      ...(hasOther ? [{ key: "other", label: "Outros", color: OTHER_COLOR }] : []),
    ];

    const rows = buckets.map((date) => {
      const row: Record<string, number | string> = {
        label: format(date, period === "week" ? "d MMM" : "MMM yy", { locale }),
      };
      const values = counts.get(date.getTime());
      for (const s of seriesList) row[s.key] = 0;
      values?.forEach((count, value) => {
        const index = top.indexOf(value);
        const key = index >= 0 ? `s${index}` : "other";
        row[key] = (row[key] as number) + count;
      });
      return row;
    });

    const chartConfig: ChartConfig = Object.fromEntries(
      seriesList.map((s) => [s.key, { label: s.label, color: s.color }]),
    );
    return { data: rows, series: seriesList, config: chartConfig };
  }, [responses, dimension, period, locale]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Evolução das Respostas</CardTitle>
          <div className="flex gap-1">
            {(["week", "month"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setPeriod(p)}
              >
                {p === "week" ? "Semana" : "Mês"}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {DIMENSIONS.map((d) => (
            <Button
              key={d.key}
              size="sm"
              variant={dimension === d.key ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setDimension(d.key)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="a"
                fill={`var(--color-${s.key})`}
                stroke="var(--card)"
                strokeWidth={1}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
        {series.length > 1 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Baseado nas últimas 1000 respostas. Uma resposta com várias disciplinas ou objetivos conta em cada um.
        </p>
      </CardContent>
    </Card>
  );
}
