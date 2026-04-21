"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectWorkspaceContext,
  selectWorkspaceError,
  selectWorkspaceLoading,
  selectWorkspaceMembers,
} from "@/store/workspace/selectors";
import { fetchOrganizationMembers } from "@/store/workspace/workspaceSlice";
import { Activity, Building2, FileText, Share2, Sparkles, Users } from "lucide-react";
import { useEffect } from "react";

const ROLE_LABELS: Record<string, string> = {
  director: "Diretor",
  school_admin: "Administrador escolar",
  teacher: "Professor",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  invited: "Convidado",
  removed: "Removido",
  suspended: "Suspenso",
};

function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
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

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function SchoolMembersPage() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector(selectWorkspaceContext);
  const members = useAppSelector(selectWorkspaceMembers);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);

  useEffect(() => {
    void dispatch(fetchOrganizationMembers());
  }, [dispatch]);

  const totalMembers = members.length;
  const activeMembers = members.filter((member) => member.status === "active").length;
  const activeThisMonth = members.filter((member) => member.generationsThisMonth > 0).length;
  const totalInternalShares = members.reduce((sum, member) => sum + member.sharedResourcesCount, 0);

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Membros da escola"
        description={`Acompanhe a atividade, os papéis e a participação da equipa em ${workspace?.organization?.name ?? "esta organização"}.`}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Building2 className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de membros</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membros ativos</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{activeMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com atividade de IA</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{activeThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partilhas internas</CardTitle>
            <Share2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{totalInternalShares}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Membros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && !loading && members.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => void dispatch(fetchOrganizationMembers())}>
                Tentar novamente
              </Button>
            </div>
          ) : loading && members.length === 0 ? (
            <p className="text-sm text-muted-foreground">A carregar membros...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não existem membros sincronizados para esta escola.
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.membershipId}
                className="flex flex-col gap-4 rounded-2xl border border-border/80 p-4 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {member.name || member.email || "Utilizador sem nome"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.email ?? "Sem email disponível"} · {formatRole(member.role)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Entrou em: {formatDate(member.joinedAt)} · Última atividade: {formatDate(member.lastActiveAt)}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
                  <div className="rounded-xl border border-border/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      Pedidos à IA
                    </div>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatCountLabel(member.generationsThisMonth, "pedido", "pedidos")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Documentos
                    </div>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatCountLabel(member.totalDocuments, "documento", "documentos")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCountLabel(member.documentsCreatedThisMonth, "criado este mês", "criados este mês")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Estado</span>
                      <Badge variant={member.status === "active" ? "default" : "outline"}>
                        {formatStatus(member.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatCountLabel(member.sharedResourcesCount, "partilha interna", "partilhas internas")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
