"use client";

import { FeedbackSeverityBadge } from "@/components/admin/feedback/FeedbackSeverityBadge";
import { FeedbackStatusBadge } from "@/components/admin/feedback/FeedbackStatusBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FeedbackFilters } from "@/services/api/admin-feedback.service";
import { BugSeverity, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import {
  fetchFeedbackList,
  fetchMetrics,
  setFilters,
} from "@/store/admin-feedback/adminFeedbackSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { AlertCircle, Bug, Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

export default function AdminFeedbackPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { items, metrics, loading, filters } = useAppSelector(
    (state) => state.adminFeedback,
  );

  const fetchData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchFeedbackList(filters)).unwrap(),
        dispatch(fetchMetrics()).unwrap(),
      ]);
    } catch {
      toast.error("Erro ao carregar dados.");
    }
  }, [dispatch, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (
    key: "type" | "status" | "severity",
    value: string,
  ) => {
    const filterValue = value === "ALL" ? "ALL" : value;
    dispatch(
      setFilters({
        [key]: filterValue,
        page: 0,
      } as FeedbackFilters),
    );
  };

  const mobileCards = (
    <div className="space-y-3">
      {loading ? (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-white/10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-6 text-center text-sm text-muted-foreground">
          Nenhum resultado encontrado.
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(`/admin/feedback/${item.id}`)}
            className="w-full rounded-xl border border-white/10 bg-card/50 p-4 text-left transition-colors hover:bg-muted/40"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {item.type === FeedbackType.BUG ? (
                  <Bug className="h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <Lightbulb className="h-4 w-4 shrink-0 text-yellow-500" />
                )}
                <p className="truncate font-medium">{item.title}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {format(new Date(item.createdAt), "dd MMM yyyy", { locale: pt })}
              </span>
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <FeedbackStatusBadge status={item.status} />
              <FeedbackSeverityBadge severity={item.severity} />
            </div>

            <p className="text-xs text-muted-foreground">
              {item.category || "-"}
            </p>
          </button>
        ))
      )}
    </div>
  );

  const desktopTable = (
    <div className="rounded-md border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="w-[90px]">Tipo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Severidade</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Nenhum resultado encontrado.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer border-white/10 hover:bg-muted/50"
                onClick={() => router.push(`/admin/feedback/${item.id}`)}
              >
                <TableCell>
                  {item.type === FeedbackType.BUG ? (
                    <Bug className="h-4 w-4 text-red-500" />
                  ) : (
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.category || "-"}</TableCell>
                <TableCell>
                  <FeedbackStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <FeedbackSeverityBadge severity={item.severity} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(item.createdAt), "dd MMM yyyy", { locale: pt })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/feedback/${item.id}`);
                    }}
                  >
                    Ver Detalhe
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <PageContainer size="7xl" contentClassName="py-4 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Gestão de Opiniões"
          description="Gerir erros reportados e sugestões dos utilizadores."
          actions={
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
          }
        />

        {metrics && (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros Críticos</CardTitle>
                <Bug className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{metrics.critical}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Novas Sugestões</CardTitle>
                <Lightbulb className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.suggestion}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros Totais</CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.bug}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          <div className="w-full">
            <Select
              value={filters.type || "ALL"}
              onValueChange={(val) => handleFilterChange("type", val)}
            >
              <SelectTrigger className="border-white/10 bg-muted/50">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Tipos</SelectItem>
                <SelectItem value={FeedbackType.BUG}>Erros</SelectItem>
                <SelectItem value={FeedbackType.SUGGESTION}>Sugestões</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <Select
              value={filters.status || "ALL"}
              onValueChange={(val) => handleFilterChange("status", val)}
            >
              <SelectTrigger className="border-white/10 bg-muted/50">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Estados</SelectItem>
                <SelectItem value={FeedbackStatus.SUBMITTED}>Recebida</SelectItem>
                <SelectItem value={FeedbackStatus.IN_REVIEW}>Em Análise</SelectItem>
                <SelectItem value={FeedbackStatus.RESOLVED}>Resolvida</SelectItem>
                <SelectItem value={FeedbackStatus.REJECTED}>Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <Select
              value={filters.severity || "ALL"}
              onValueChange={(val) => handleFilterChange("severity", val)}
            >
              <SelectTrigger className="border-white/10 bg-muted/50">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Severidades</SelectItem>
                <SelectItem value={BugSeverity.LOW}>Baixa</SelectItem>
                <SelectItem value={BugSeverity.MEDIUM}>Média</SelectItem>
                <SelectItem value={BugSeverity.HIGH}>Alta</SelectItem>
                <SelectItem value={BugSeverity.CRITICAL}>Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ResponsiveDataView
          mobileCardView={mobileCards}
          desktopTableView={desktopTable}
        />
      </div>
    </PageContainer>
  );
}
