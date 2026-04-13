"use client";

import { FeedbackSeverityBadge } from "@/components/admin/feedback/FeedbackSeverityBadge";
import { FeedbackStatusBadge } from "@/components/admin/feedback/FeedbackStatusBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BugSeverity, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import {
  fetchFeedbackList,
  fetchMetrics,
  setFilters,
} from "@/store/admin-feedback/adminFeedbackSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  AlertCircle,
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: FeedbackType.BUG, label: "Erros" },
  { value: FeedbackType.SUGGESTION, label: "Sugestões" },
] as const;

const STATUS_OPTIONS = [
  { value: FeedbackStatus.SUBMITTED, label: "Recebida" },
  { value: FeedbackStatus.IN_REVIEW, label: "Em Análise" },
  { value: FeedbackStatus.IN_DEVELOPMENT, label: "Em Desenvolvimento" },
  { value: FeedbackStatus.RESOLVED, label: "Resolvida" },
  { value: FeedbackStatus.REJECTED, label: "Rejeitada" },
] as const;

const DEFAULT_STATUS_FILTERS: FeedbackStatus[] = [
  FeedbackStatus.SUBMITTED,
  FeedbackStatus.IN_REVIEW,
  FeedbackStatus.IN_DEVELOPMENT,
];

const SEVERITY_OPTIONS = [
  { value: BugSeverity.LOW, label: "Baixa" },
  { value: BugSeverity.MEDIUM, label: "Média" },
  { value: BugSeverity.HIGH, label: "Alta" },
  { value: BugSeverity.CRITICAL, label: "Crítica" },
] as const;

const getFilterButtonLabel = <T extends string>(
  title: string,
  selectedValues: T[],
  options: readonly { value: T; label: string }[],
) => {
  if (!selectedValues.length || selectedValues.length === options.length) {
    return `${title}: Todos`;
  }

  const selectedLabels = options
    .filter(({ value }) => selectedValues.includes(value))
    .map(({ label }) => label);

  if (selectedLabels.length <= 2) {
    return `${title}: ${selectedLabels.join(", ")}`;
  }

  return `${title}: ${selectedLabels.length} selecionados`;
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { items, metrics, loading, filters, totalItems } = useAppSelector(
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

  const selectedTypes = filters.type ?? [];
  const selectedStatuses = filters.status ?? [];
  const selectedSeverities = filters.severity ?? [];
  const currentPage = filters.page ?? 0;
  const pageSize = filters.size ?? 20;
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;

  const handleTypeToggle = (value: FeedbackType) => {
    const nextValues = selectedTypes.includes(value)
      ? selectedTypes.filter((currentValue) => currentValue !== value)
      : [...selectedTypes, value];

    dispatch(setFilters({ type: nextValues, page: 0 }));
  };

  const handleStatusToggle = (value: FeedbackStatus) => {
    const nextValues = selectedStatuses.includes(value)
      ? selectedStatuses.filter((currentValue) => currentValue !== value)
      : [...selectedStatuses, value];

    dispatch(setFilters({ status: nextValues, page: 0 }));
  };

  const handleSeverityToggle = (value: BugSeverity) => {
    const nextValues = selectedSeverities.includes(value)
      ? selectedSeverities.filter((currentValue) => currentValue !== value)
      : [...selectedSeverities, value];

    dispatch(setFilters({ severity: nextValues, page: 0 }));
  };

  const handleClearFilters = () => {
    dispatch(
      setFilters({
        type: [],
        status: [...DEFAULT_STATUS_FILTERS],
        severity: [],
        page: 0,
      }),
    );
  };

  const isDefaultFilters =
    selectedTypes.length === 0 &&
    selectedSeverities.length === 0 &&
    selectedStatuses.length === DEFAULT_STATUS_FILTERS.length &&
    DEFAULT_STATUS_FILTERS.every((status) => selectedStatuses.includes(status));

  const getCategoryLabel = (item: (typeof items)[number]) =>
    item.type === FeedbackType.BUG ? item.bugType || "-" : item.category || "-";
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
              {item.type === FeedbackType.BUG && (
                <FeedbackSeverityBadge severity={item.severity} />
              )}
            </div>

            <p className="text-xs text-muted-foreground">{item.userEmail}</p>
            <p className="mt-1 text-xs text-muted-foreground">{getCategoryLabel(item)}</p>
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
            <TableHead>Utilizador</TableHead>
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
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
                <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                  {item.userEmail}
                </TableCell>
                <TableCell>{getCategoryLabel(item)}</TableCell>
                <TableCell>
                  <FeedbackStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  {item.type === FeedbackType.BUG ? (
                    <FeedbackSeverityBadge severity={item.severity} />
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-white/10 bg-muted/50 font-normal">
                <span className="truncate">
                  {getFilterButtonLabel("Tipo", selectedTypes, TYPE_OPTIONS)}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Tipo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TYPE_OPTIONS.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={selectedTypes.includes(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => handleTypeToggle(value)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-white/10 bg-muted/50 font-normal">
                <span className="truncate">
                  {getFilterButtonLabel("Estado", selectedStatuses, STATUS_OPTIONS)}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Estado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={selectedStatuses.includes(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => handleStatusToggle(value)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-white/10 bg-muted/50 font-normal">
                <span className="truncate">
                  {getFilterButtonLabel("Severidade", selectedSeverities, SEVERITY_OPTIONS)}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Severidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SEVERITY_OPTIONS.map(({ value, label }) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={selectedSeverities.includes(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => handleSeverityToggle(value)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="w-full border-white/10 bg-muted/50"
            onClick={handleClearFilters}
            disabled={isDefaultFilters}
          >
            Limpar
          </Button>
        </div>

        <ResponsiveDataView
          mobileCardView={mobileCards}
          desktopTableView={desktopTable}
        />

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              Mostrando <span className="font-medium text-foreground">{items.length}</span> de{" "}
              <span className="font-medium text-foreground">{totalItems}</span> opiniÃµes
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(setFilters({ page: currentPage - 1 }))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>

              <span className="px-2 text-sm text-muted-foreground">
                {currentPage + 1} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(setFilters({ page: currentPage + 1 }))}
                disabled={currentPage >= totalPages - 1}
              >
                PrÃ³ximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

