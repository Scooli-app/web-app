"use client";

import { FeedbackSeverityBadge } from "@/components/admin/feedback/FeedbackSeverityBadge";
import { FeedbackStatusBadge } from "@/components/admin/feedback/FeedbackStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FeedbackFilters } from "@/services/api/admin-feedback.service";
import { BugSeverity, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import {
  fetchFeedbackList,
  fetchMetrics,
  setFilters
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
  
  const { items, metrics, loading, filters } = useAppSelector((state) => state.adminFeedback);

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

  const handleFilterChange = (key: "type" | "status" | "severity", value: string) => {
    const filterValue = value === "ALL" ? "ALL" : value;
    dispatch(setFilters({
      [key]: filterValue,
      page: 0, 
    } as FeedbackFilters));
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Feedback</h1>
          <p className="text-muted-foreground mt-1">Gerir bugs reportados e sugestões dos utilizadores.</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">Bugs Críticos</CardTitle>
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
              <CardTitle className="text-sm font-medium">Bugs Totais</CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.bug}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4 items-center flex-wrap">
        <div className="w-[200px]">
          <Select 
            value={filters.type || "ALL"} 
            onValueChange={(val) => handleFilterChange("type", val)}
          >
            <SelectTrigger className="border-white/10 bg-muted/50">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Tipos</SelectItem>
              <SelectItem value={FeedbackType.BUG}>Bugs</SelectItem>
              <SelectItem value={FeedbackType.SUGGESTION}>Sugestões</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-[200px]">
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

        <div className="w-[200px]">
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

      <div className="rounded-md border border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="w-[100px]">Tipo</TableHead>
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
                <TableRow key={item.id} className="border-white/10 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/admin/feedback/${item.id}`)}>
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
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(item.createdAt), "dd MMM yyyy", { locale: pt })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation(); 
                      router.push(`/admin/feedback/${item.id}`);
                    }}>
                      Ver Detalhe
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Add pagination controls if totalItems > size */}
    </div>
  );
}
