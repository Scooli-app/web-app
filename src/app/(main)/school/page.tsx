"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectWorkspaceContext,
  selectWorkspaceDashboard,
  selectWorkspaceError,
  selectWorkspaceLoading,
} from "@/store/workspace/selectors";
import { fetchOrganizationDashboard } from "@/store/workspace/workspaceSlice";
import {
  BookOpenText,
  Building2,
  ChartColumn,
  FileText,
  LibraryBig,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect } from "react";

const STATS = [
  { key: "activeSeats", title: "Lugares ativos", icon: Users },
  { key: "availableSeats", title: "Lugares disponíveis", icon: ShieldCheck },
  { key: "activeTeachersThisMonth", title: "Professores ativos", icon: Building2 },
  { key: "generationsThisMonth", title: "Pedidos à IA este mês", icon: ChartColumn },
  { key: "totalDocuments", title: "Documentos da escola", icon: FileText },
  { key: "sharedResources", title: "Biblioteca interna", icon: LibraryBig },
] as const;

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  canceled: "Cancelada",
  draft: "Rascunho",
  expired: "Expirada",
  past_due: "Em atraso",
  trialing: "Em avaliação",
};

const ROLE_LABELS: Record<string, string> = {
  director: "Diretor",
  school_admin: "Administrador escolar",
  teacher: "Professor",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  lessonPlan: "Plano de Aula",
  presentation: "Apresentação",
  quiz: "Quiz",
  test: "Teste",
  worksheet: "Ficha de Trabalho",
};

function formatDocumentType(documentType: string): string {
  return DOCUMENT_TYPE_LABELS[documentType] ?? documentType;
}

function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function formatSubscriptionStatus(status?: string | null): string {
  if (!status) {
    return "Por definir";
  }
  return SUBSCRIPTION_STATUS_LABELS[status] ?? status;
}

function formatDate(date?: string | null): string {
  if (!date) {
    return "Por definir";
  }

  return new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDay(date: string): string {
  return new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function SchoolDashboardPage() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector(selectWorkspaceContext);
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);

  useEffect(() => {
    void dispatch(fetchOrganizationDashboard());
  }, [dispatch]);

  const maxActivity = Math.max(
    ...(dashboard?.activityByDay?.map((point) => point.generations) ?? [0]),
    1,
  );

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={workspace?.organization?.name ?? "Escola"}
        description="Visão operacional da organização, utilização da equipa e atividade recente."
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Building2 className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      {error && !loading && !dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar o dashboard da escola</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void dispatch(fetchOrganizationDashboard())}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {STATS.map((item) => {
              const Icon = item.icon;
              const value = dashboard?.[item.key] ?? 0;

              return (
                <Card key={item.key} className="border-border/80 bg-card/95">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="max-w-[10rem] text-sm font-medium leading-5 text-muted-foreground">
                      {item.title}
                    </CardTitle>
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold tracking-tight">
                      {loading && !dashboard ? "..." : value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Plano e contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Plano</span>
                  <span className="font-medium text-foreground">{dashboard?.planCode ?? "Manual"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Estado</span>
                  <Badge variant="secondary">{formatSubscriptionStatus(dashboard?.subscriptionStatus)}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Limite de lugares</span>
                  <span className="font-medium text-foreground">{dashboard?.seatLimit ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Renovação</span>
                  <span className="font-medium text-foreground">{formatDate(dashboard?.renewalAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de utilização</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">Convites pendentes</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard?.invitedSeats ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">Lugares suspensos</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard?.suspendedSeats ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">Documentos criados este mês</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {dashboard?.documentsCreatedThisMonth ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">Partilhas internas</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard?.sharedResources ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Atividade dos últimos 14 dias</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pedidos à IA concluídos com sucesso pela escola nos últimos catorze dias.
                  </p>
                </div>
                <Badge variant="outline">
                  {formatCountLabel(dashboard?.generationsThisMonth ?? 0, "pedido", "pedidos")} este mês
                </Badge>
              </CardHeader>
              <CardContent>
                {dashboard?.activityByDay?.length ? (
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <div className="flex h-64 items-end gap-2 sm:gap-3">
                      {dashboard.activityByDay.map((point) => {
                        const barHeight = Math.max((point.generations / maxActivity) * 100, point.generations > 0 ? 12 : 4);

                        return (
                          <div key={point.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                            <div className="text-center text-xs font-medium text-foreground">
                              {point.generations}
                            </div>
                            <div className="relative flex-1 rounded-xl bg-muted/60">
                              <div
                                className="absolute inset-x-0 bottom-0 rounded-xl bg-gradient-to-t from-primary to-primary/70 transition-all"
                                style={{ height: `${barHeight}%` }}
                                title={`${formatShortDay(point.date)}: ${formatCountLabel(point.generations, "pedido", "pedidos")}`}
                              />
                            </div>
                            <div className="text-center text-[11px] text-muted-foreground">
                              {formatShortDay(point.date)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 px-6 py-10 text-center text-sm text-muted-foreground">
                    Ainda não existe atividade suficiente para desenhar o gráfico.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipos de documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard?.topDocumentTypes?.length ? (
                  dashboard.topDocumentTypes.map((item) => (
                    <div
                      key={item.documentType}
                      className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <BookOpenText className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {formatDocumentType(item.documentType)}
                        </span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ainda não existem documentos suficientes para mostrar a distribuição por tipo.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Utilizadores mais ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard?.topActiveMembers?.length ? (
                dashboard.topActiveMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-col gap-4 rounded-2xl border border-border/80 p-4 xl:flex-row xl:items-center xl:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {member.name || member.email || "Utilizador"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {member.email ?? "Sem email"} · {formatRole(member.role)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Última atividade: {formatDate(member.lastActiveAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">
                        {formatCountLabel(member.generationsThisMonth, "pedido à IA", "pedidos à IA")}
                      </Badge>
                      <Badge variant="secondary">
                        {formatCountLabel(member.documentsCreatedThisMonth, "documento no mês", "documentos no mês")}
                      </Badge>
                      <Badge variant="outline">
                        {formatCountLabel(member.totalDocuments, "documento total", "documentos totais")}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não há atividade suficiente para destacar utilizadores.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
