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
import {
  adminActivityService,
  type AdminActivity,
} from "@/services/api/admin-activity.service";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";

type Period = "daily" | "weekly" | "monthly";

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Dia" },
  { key: "weekly", label: "Semana" },
  { key: "monthly", label: "Mês" },
];

const chartConfig: ChartConfig = {
  activeUsers: { label: "Utilizadores ativos", color: "var(--chart-1)" },
  newUsers: { label: "Novos registos", color: "var(--chart-2)" },
};

const numberFormatter = new Intl.NumberFormat("pt-PT");

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{numberFormatter.format(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Active users now / per day, week and month, plus the most active teachers. */
export function ActivityPanel() {
  const locale = useDateFnsLocale();
  const [data, setData] = useState<AdminActivity | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("daily");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminActivityService.getActivity());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border/70 bg-card/60 text-sm text-muted-foreground">
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : error && "Não foi possível carregar a atividade."}
      </div>
    );
  }

  const { summary } = data;
  const tick = period === "monthly" ? "MMM yy" : "d MMM";
  const points = data[period].map((p) => ({ ...p, label: format(parseISO(p.date), tick, { locale }) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Ativos agora" value={summary.activeNow} hint="ação nos últimos 15 min" />
        <Stat label="Ativos hoje" value={summary.activeToday} hint="últimas 24 h" />
        <Stat label="Ativos na semana" value={summary.activeWeek} hint="últimos 7 dias" />
        <Stat label="Ativos no mês" value={summary.activeMonth} hint="últimos 30 dias" />
        <Stat label="Total de utilizadores" value={summary.totalUsers} />
        <Stat
          label="Novos registos"
          value={summary.newUsersWeek}
          hint={`7 dias · ${numberFormatter.format(summary.newUsersMonth)} em 30 dias`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Atividade</CardTitle>
            <div className="flex items-center gap-1">
              {PERIODS.map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={period === p.key ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Atualizar atividade"
              >
                <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
              <AreaChart data={points} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="activeUsers"
                  type="monotone"
                  stroke="var(--color-activeUsers)"
                  strokeWidth={2}
                  fill="var(--color-activeUsers)"
                  fillOpacity={0.12}
                />
                <Line
                  dataKey="newUsers"
                  type="monotone"
                  stroke="var(--color-newUsers)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {Object.entries(chartConfig).map(([key, item]) => (
                <li key={key} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Ativo = criou ou editou um documento, usou a IA, registou uma aula ou partilhou um recurso.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mais ativos (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem atividade nos últimos 30 dias.</p>
            ) : (
              <ol className="space-y-2">
                {data.topUsers.map((user, index) => (
                  <li key={user.userId} className="flex items-baseline gap-2 text-sm">
                    <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{user.name || user.email}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.lastActiveAt
                          ? `há ${formatDistanceToNow(parseISO(user.lastActiveAt), { locale })}`
                          : user.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{user.activeDays}</span>
                      {` dias · ${user.actions} ações`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
