"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdmin } from "@/hooks/useAdmin";
import {
  type AdminUserCost,
  adminCostInsightsService,
} from "@/services/api/admin-cost-insights.service";
import { ArrowLeft, DollarSign, Image as ImageIcon, Loader2, Type } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const PERIOD_OPTIONS = [
  { label: "Últimos 30 dias", from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString(); } },
  { label: "Lifetime",        from: () => "2024-01-01T00:00:00Z" },
];

function formatUsd(v: number) {
  return `$${v.toFixed(4)}`;
}

function formatNumber(v: number | undefined) {
  if (v === undefined) return "—";
  return v.toLocaleString("pt-PT");
}

export default function AdminUserCostPage() {
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [periodIdx, setPeriodIdx] = useState(0);
  const [userData, setUserData] = useState<AdminUserCost | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      to.setDate(to.getDate() + 1);
      const from = PERIOD_OPTIONS[periodIdx].from();
      const result = await adminCostInsightsService.getInsights({
        from,
        to: to.toISOString(),
        limit: 500,
      });
      const found = result.users.find((u) => u.userId === userId) ?? null;
      setUserData(found);
    } catch {
      toast.error("Não foi possível carregar os dados do utilizador.");
    } finally {
      setLoading(false);
    }
  }, [userId, periodIdx]);

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/costs")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <PageHeader
        title={userData?.name ?? userData?.email ?? `Utilizador ${userId.slice(0, 8)}`}
        description={userData?.email ?? "Detalhe de custos AI"}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <DollarSign className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      {/* Period selector */}
      <div className="mb-6 flex gap-2">
        {PERIOD_OPTIONS.map((opt, idx) => (
          <Button
            key={opt.label}
            variant={periodIdx === idx ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodIdx(idx)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {loading && !userData ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !userData ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Sem dados de custo para este utilizador no período selecionado.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" /> Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUsd(userData.totalCostUsd)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatNumber(userData.interactions)} interações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <Type className="h-4 w-4" /> Texto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUsd(userData.textCostUsd)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatNumber(userData.tokensInput + userData.tokensOutput)} tokens
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <ImageIcon className="h-4 w-4" /> Imagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUsd(userData.imageCostUsd)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {userData.imageCount} imagens geradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Última atividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {userData.lastActivityAt
                    ? new Date(userData.lastActivityAt).toLocaleDateString("pt-PT")
                    : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {userData.lastActivityAt
                    ? new Date(userData.lastActivityAt).toLocaleTimeString("pt-PT")
                    : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Breakdown by tool */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Por Ferramenta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(userData.breakdownByTool).map(([tool, cost]) => (
                    <div key={tool} className="flex items-center justify-between">
                      <span className="capitalize text-sm text-muted-foreground">{tool}</span>
                      <span className="font-mono text-sm font-medium">{formatUsd(cost)}</span>
                    </div>
                  ))}
                  {Object.keys(userData.breakdownByTool).length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem dados</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top models */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Por Modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userData.topModels.map((m) => (
                    <div key={m.model} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm" title={m.model}>
                          {m.model.length > 35 ? `${m.model.slice(0, 35)}…` : m.model}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatNumber(m.interactions)} interações</p>
                      </div>
                      <span className="font-mono text-sm font-medium">{formatUsd(m.costUsd)}</span>
                    </div>
                  ))}
                  {userData.topModels.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem dados</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Breakdown by event type */}
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Por Tipo de Evento</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(userData.breakdownByEventType).map(([event, cost]) => (
                      <TableRow key={event}>
                        <TableCell className="text-muted-foreground">{event}</TableCell>
                        <TableCell className="text-right font-mono">{formatUsd(cost)}</TableCell>
                      </TableRow>
                    ))}
                    {Object.keys(userData.breakdownByEventType).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-4 text-center text-muted-foreground">
                          Sem dados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}
