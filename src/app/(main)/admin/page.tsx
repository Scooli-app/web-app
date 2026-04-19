"use client";

import StatusCard from "@/components/admin/StatusCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/useAdmin";
import { BarChart3, LayoutDashboard, Library, MessageSquare, Shield, ToggleLeft, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isLoaded, isAdmin, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Consola de Administração"
        description="Gerir a plataforma Scooli e os utilizadores."
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Shield className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Total de Utilizadores</span>
          </div>
          <p className="text-3xl font-bold">1,284</p>
          <p className="mt-1 text-xs font-medium text-emerald-500">+12% esta semana</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Sessões Ativas</span>
          </div>
          <p className="text-3xl font-bold">86</p>
          <p className="mt-1 text-xs text-muted-foreground">Monitorização em tempo real ativa</p>
        </div>

        <StatusCard />
      </div>

      <div className="mt-8 sm:mt-10">
        <h2 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Gestão</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
            onClick={() => router.push("/admin/feedback")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                <MessageSquare className="h-5 w-5" />
                Opiniões
              </CardTitle>
              <CardDescription>
                Gerir opiniões dos utilizadores, erros reportados e sugestões.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Ver tickets submetidos, atualizar estados e responder aos utilizadores.
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
            onClick={() => router.push("/admin/moderation")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                <Library className="h-5 w-5" />
                Moderação da Comunidade
              </CardTitle>
              <CardDescription>
                Rever e aprovar recursos partilhados pela comunidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Gerir recursos pedagógicos alinhados com o currículo antes da publicação.
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
            onClick={() => router.push("/admin/features")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                <ToggleLeft className="h-5 w-5" />
                Controlo de Funcionalidades
              </CardTitle>
              <CardDescription>
                Controlar a disponibilidade de funcionalidades por utilizador e plano.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Ativar funcionalidades globalmente, por percentagem, ou por exceções de utilizador/perfil.
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
            onClick={() => router.push("/admin/users")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                <BarChart3 className="h-5 w-5" />
                Insights de Utilizacao
              </CardTitle>
              <CardDescription>
                Perceber quem voltou, quem tentou uma vez e o que cada utilizador fez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Ver documentos criados, chats com AI, atividade por utilizador e enriquecimento via Clerk.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
