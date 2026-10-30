"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/hooks/useAdmin";
import { adminPilotMetricsService } from "@/services/api/admin-pilot-metrics.service";
import type { PilotMetricsReport } from "@/shared/types/pilot-metrics";
import { Activity, Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatWeekDate } from "./format";
import { PilotHeadlines } from "./PilotHeadlines";
import { PilotTurmaTable } from "./PilotTurmaTable";
import {
  apiRange,
  buildPilotMetricsCsv,
  computeHeadlines,
  defaultRange,
  groupByTurma,
  weekOptions,
} from "./pilot-metrics";

interface LoadResult {
  key: string;
  report?: PilotMetricsReport;
  failed: boolean;
}

export function PilotMetricsPage() {
  const t = useTranslations("adminPilot");
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();

  const [range, setRange] = useState(() => defaultRange());
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);

  const { fromWeek, toWeek } = range;
  const queryKey = `${fromWeek}|${toWeek}|${attempt}`;
  const report = result?.key === queryKey ? result.report : undefined;
  const failed = result?.key === queryKey && result.failed;
  const loading = isAdmin && result?.key !== queryKey;

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const { from, to } = apiRange(fromWeek, toWeek);
    adminPilotMetricsService
      .getPilotMetrics({ from, to })
      .then((loaded) => {
        if (!cancelled) setResult({ key: queryKey, report: loaded, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: queryKey, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, fromWeek, toWeek, queryKey]);

  const headlines = useMemo(() => (report ? computeHeadlines(report) : null), [report]);
  const groups = useMemo(() => (report ? groupByTurma(report.rows) : []), [report]);
  const weeks = useMemo(() => weekOptions(), []);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const handleFromChange = (value: string) => {
    setRange({ fromWeek: value, toWeek: value > toWeek ? value : toWeek });
  };

  const handleToChange = (value: string) => {
    setRange({ fromWeek: value < fromWeek ? value : fromWeek, toWeek: value });
  };

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob(["﻿", buildPilotMetricsCsv(report.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pilot-metrics-${fromWeek}-${toWeek}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const weekSelect = (value: string, onChange: (value: string) => void, label: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[...weeks].reverse().map((monday) => (
            <SelectItem key={monday} value={monday}>
              {t("range.weekOf", { date: formatWeekDate(monday) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Activity className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!report || report.rows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {t("exportCsv")}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        {weekSelect(fromWeek, handleFromChange, t("range.from"))}
        {weekSelect(toWeek, handleToChange, t("range.to"))}
        {loading && <Loader2 className="mb-2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {failed && <LoadError message={t("loadFailed")} onRetry={() => setAttempt((n) => n + 1)} />}

      {!failed && (!report || !headlines) && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {report && headlines && report.rows.length === 0 && (
        <EmptyState
          icon={Activity}
          title={t("empty.title")}
          description={t("empty.description")}
          size="inline"
        />
      )}

      {report && headlines && report.rows.length > 0 && (
        <div className="space-y-6">
          <PilotHeadlines headlines={headlines} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("table.title")}
                <Badge variant="secondary" className="ml-2">
                  {groups.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PilotTurmaTable groups={groups} weeks={report.weeks} />
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
