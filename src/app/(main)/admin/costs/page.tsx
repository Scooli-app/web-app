"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdmin } from "@/hooks/useAdmin";
import {
  type AdminCostInsightsResponse,
  adminCostInsightsService,
} from "@/services/api/admin-cost-insights.service";
import { ArrowUpDown, ChevronDown, ChevronUp, DollarSign, Image as ImageIcon, Loader2, RefreshCw, Shield, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CostSortField = "name" | "interactions" | "textCost" | "imageCost" | "total";
type SortDir = "asc" | "desc";

function SortableHead({
  field,
  label,
  current,
  dir,
  className,
  onSort,
}: {
  field: CostSortField;
  label: string;
  current: CostSortField;
  dir: SortDir;
  className?: string;
  onSort: (f: CostSortField) => void;
}) {
  const active = current === field;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:text-foreground${className ? ` ${className}` : ""}`}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center justify-end gap-1">
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
import { toast } from "sonner";

const PERIOD_OPTIONS = [
  { label: "Últimos 7 dias",  value: "7d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Este mês",        value: "month" },
  { label: "Lifetime",        value: "all" },
] as const;

function getPeriodDates(period: string): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  switch (period) {
    case "7d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString(), to };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { from, to };
    }
    case "all":
      return { from: "2024-01-01T00:00:00Z", to };
    default: {
      // 30d
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString(), to };
    }
  }
}

function formatUsd(v: number) {
  return `$${v.toFixed(4)}`;
}

function formatUsdShort(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

function formatNumber(v: number | undefined) {
  if (v === undefined) return "—";
  return v.toLocaleString("pt-PT");
}

export default function AdminCostsPage() {
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();

  const [period, setPeriod] = useState<string>("30d");
  const [data, setData] = useState<AdminCostInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [invalidating, setInvalidating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [sortField, setSortField] = useState<CostSortField>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: CostSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const loadData = useCallback(async (p: string) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const { from, to } = getPeriodDates(p);
      const result = await adminCostInsightsService.getInsights({ from, to, limit: 200 });
      setData(result);
    } catch {
      toast.error("Não foi possível carregar os custos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadData(period);
  }, [isAdmin, period, loadData]);

  const handleInvalidateCache = async () => {
    setInvalidating(true);
    try {
      await adminCostInsightsService.invalidatePricingCache();
      toast.success("Cache de preços invalidado. A recarregar...");
      await loadData(period);
    } catch {
      toast.error("Erro ao invalidar o cache.");
    } finally {
      setInvalidating(false);
    }
  };

  // Hooks must be called before any early return
  const users = useMemo(() => {
    return [...(data?.users ?? [])].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "");
          break;
        case "interactions":
          cmp = (a.interactions ?? 0) - (b.interactions ?? 0);
          break;
        case "textCost":
          cmp = a.textCostUsd - b.textCostUsd;
          break;
        case "imageCost":
          cmp = a.imageCostUsd - b.imageCostUsd;
          break;
        case "total":
          cmp = a.totalCostUsd - b.totalCostUsd;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data?.users, sortField, sortDir]);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Custos AI"
        description="Custos por utilizador com OpenAI e OpenRouter."
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <DollarSign className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => loadData(period)} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>

        <Button variant="ghost" size="sm" onClick={handleInvalidateCache} disabled={invalidating}>
          {invalidating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Shield className="mr-2 h-4 w-4" />
          )}
          Invalidar cache preços
        </Button>

        {summary && (
          <span className="ml-auto text-xs text-muted-foreground">
            Versão preços: <code>{summary.pricingVersion}</code>
          </span>
        )}
      </div>

      {/* Summary cards */}
      {loading && !data ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" /> Custo Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUsdShort(summary?.totalCostUsd ?? 0)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatNumber(summary?.eventsWithCost)} eventos c/ custo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" /> Média / Utilizador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUsd(summary?.averagePerUserUsd ?? 0)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mediana: {formatUsd(summary?.medianPerUserUsd ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <Type className="h-4 w-4" /> Custo Texto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUsdShort(summary?.textCostUsd ?? 0)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">OpenAI LLM</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <ImageIcon className="h-4 w-4" /> Custo Imagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUsdShort(summary?.imageCostUsd ?? 0)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">OpenRouter</p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdowns */}
          {summary && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Custo por Ferramenta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(summary.costByTool).slice(0, 6).map(([tool, cost]) => (
                      <div key={tool} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{tool}</span>
                        <span className="font-mono font-medium">{formatUsd(cost)}</span>
                      </div>
                    ))}
                    {Object.keys(summary.costByTool).length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem dados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Custo por Modelo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(summary.costByModel).slice(0, 5).map(([model, cost]) => (
                      <div key={model} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[140px] text-muted-foreground" title={model}>
                          {model}
                        </span>
                        <span className="font-mono font-medium">{formatUsd(cost)}</span>
                      </div>
                    ))}
                    {Object.keys(summary.costByModel).length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem dados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Custo por Tipo de Evento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(summary.costByEventType).slice(0, 6).map(([event, cost]) => (
                      <div key={event} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{event}</span>
                        <span className="font-mono font-medium">{formatUsd(cost)}</span>
                      </div>
                    ))}
                    {Object.keys(summary.costByEventType).length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem dados</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Custo por Utilizador
                <Badge variant="secondary" className="ml-2">
                  {users.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHead field="name" label="Utilizador" current={sortField} dir={sortDir} className="text-left" onSort={handleSort} />
                      <SortableHead field="interactions" label="Interações" current={sortField} dir={sortDir} onSort={handleSort} />
                      <TableHead className="text-right">Tokens in/out</TableHead>
                      <TableHead className="text-right">Imagens</TableHead>
                      <SortableHead field="textCost" label="Custo Texto" current={sortField} dir={sortDir} onSort={handleSort} />
                      <SortableHead field="imageCost" label="Custo Imagens" current={sortField} dir={sortDir} onSort={handleSort} />
                      <SortableHead field="total" label="Total" current={sortField} dir={sortDir} className="font-semibold" onSort={handleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          {loading ? "A carregar..." : "Sem dados para o período selecionado."}
                        </TableCell>
                      </TableRow>
                    )}
                    {users.map((user) => (
                      <TableRow
                        key={user.userId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/admin/costs/${user.userId}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name ?? user.email ?? user.userId.slice(0, 8)}</p>
                            {user.email && (
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(user.interactions)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatNumber(user.tokensInput)} / {formatNumber(user.tokensOutput)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{user.imageCount}</TableCell>
                        <TableCell className="text-right font-mono">{formatUsd(user.textCostUsd)}</TableCell>
                        <TableCell className="text-right font-mono">{formatUsd(user.imageCostUsd)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatUsd(user.totalCostUsd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
