"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ChartColumn, FileText, LibraryBig, ShieldCheck, Users } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectWorkspaceError,
  selectHasOrganizationWorkspace,
  selectIsOrganizationAdmin,
  selectWorkspaceContext,
  selectWorkspaceDashboard,
  selectWorkspaceLoading,
  selectWorkspaceReady,
} from "@/store/workspace/selectors";
import { fetchOrganizationDashboard } from "@/store/workspace/workspaceSlice";

const STATS = [
  {
    key: "activeSeats",
    title: "Lugares ativos",
    icon: Users,
  },
  {
    key: "availableSeats",
    title: "Lugares disponíveis",
    icon: ShieldCheck,
  },
  {
    key: "activeTeachersThisMonth",
    title: "Professores ativos",
    icon: Building2,
  },
  {
    key: "generationsThisMonth",
    title: "Gerações este mês",
    icon: ChartColumn,
  },
  {
    key: "totalDocuments",
    title: "Documentos da escola",
    icon: FileText,
  },
  {
    key: "sharedResources",
    title: "Biblioteca interna",
    icon: LibraryBig,
  },
] as const;

export default function SchoolDashboardPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const workspace = useAppSelector(selectWorkspaceContext);
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);
  const workspaceReady = useAppSelector(selectWorkspaceReady);
  const hasOrganizationWorkspace = useAppSelector(selectHasOrganizationWorkspace);
  const isOrganizationAdmin = useAppSelector(selectIsOrganizationAdmin);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    if (!hasOrganizationWorkspace) {
      router.replace("/dashboard");
      return;
    }

    if (!isOrganizationAdmin) {
      router.replace("/dashboard");
      return;
    }

    void dispatch(fetchOrganizationDashboard());
  }, [dispatch, hasOrganizationWorkspace, isOrganizationAdmin, router, workspaceReady]);

  if (!workspaceReady || !hasOrganizationWorkspace || !isOrganizationAdmin) {
    return null;
  }

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={workspace?.organization?.name ?? "Escola"}
        description="Visão operacional da organização, lugares e atividade recente."
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
            <Button
              variant="outline"
              onClick={() => void dispatch(fetchOrganizationDashboard())}
            >
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
                <Card key={item.key}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-primary" />
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
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Plano: <span className="font-medium text-foreground">{dashboard?.planCode ?? "manual"}</span>
                </p>
                <p>
                  Estado:{" "}
                  <span className="font-medium text-foreground">
                    {dashboard?.subscriptionStatus ?? "draft"}
                  </span>
                </p>
                <p>
                  Limite de lugares:{" "}
                  <span className="font-medium text-foreground">{dashboard?.seatLimit ?? 0}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de utilização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Convites pendentes:{" "}
                  <span className="font-medium text-foreground">{dashboard?.invitedSeats ?? 0}</span>
                </p>
                <p>
                  Lugares suspensos:{" "}
                  <span className="font-medium text-foreground">{dashboard?.suspendedSeats ?? 0}</span>
                </p>
                <p>
                  Renovação:{" "}
                  <span className="font-medium text-foreground">
                    {dashboard?.renewalAt
                      ? new Date(dashboard.renewalAt).toLocaleDateString("pt-PT")
                      : "por definir"}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Atividade dos ultimos 14 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                  {dashboard?.activityByDay?.map((point) => (
                    <div key={point.date} className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(point.date).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{point.generations}</p>
                      <p className="text-xs text-muted-foreground">geracoes</p>
                    </div>
                  ))}
                </div>
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
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{item.documentType}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ainda sem distribuicao suficiente para mostrar.
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
                    className="flex flex-col gap-3 rounded-xl border border-border p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {member.name || member.email || "Utilizador"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email ?? "Sem email"} · {member.role}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">{member.generationsThisMonth} geracoes</Badge>
                      <Badge variant="secondary">{member.documentsCreatedThisMonth} docs no mes</Badge>
                      <Badge variant="outline">{member.totalDocuments} docs totais</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda nao ha atividade suficiente para destacar utilizadores.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
