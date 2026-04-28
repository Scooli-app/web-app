"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdmin } from "@/hooks/useAdmin";
import {
  type AdminUserActivityBucket,
  type AdminUserInsight,
  adminUserInsightsService,
} from "@/services/api/admin-user-insights.service";
import { cn } from "@/shared/utils/utils";
import {
  BarChart3,
  Bot,
  FileText,
  MessageSquare,
  RefreshCw,
  Search,
  Share2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

const bucketLabels: Record<AdminUserActivityBucket | "all", string> = {
  all: "Todos",
  inactive: "Sem atividade",
  single_day: "Tentou uma vez",
  repeat: "Voltou",
};

const bucketBadgeClasses: Record<AdminUserActivityBucket, string> = {
  inactive: "border-slate-200 bg-slate-100 text-slate-700",
  single_day: "border-amber-200 bg-amber-100 text-amber-800",
  repeat: "border-emerald-200 bg-emerald-100 text-emerald-800",
};

const numberFormatter = new Intl.NumberFormat("pt-PT");

function formatCount(value?: number | null) {
  return numberFormatter.format(value ?? 0);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function matchesSearch(user: AdminUserInsight, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    user.email,
    user.name ?? "",
    user.username ?? "",
    user.clerkUserId,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function getConversationCount(user: AdminUserInsight) {
  return user.documentChatInteractions + user.assistantChatInteractions;
}

function getImageCount(user: AdminUserInsight) {
  return user.imageGenerationInteractions + user.imageRegenerationInteractions;
}

function ActivityBadge({ bucket }: { bucket: AdminUserActivityBucket }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        bucketBadgeClasses[bucket],
      )}
    >
      {bucketLabels[bucket]}
    </Badge>
  );
}

function SummaryStatCard({
  icon,
  label,
  value,
  helper,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/70 shadow-sm", className)}>
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="text-sm">{label}</CardDescription>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        <CardTitle className="text-3xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm leading-6 text-muted-foreground">
        {helper}
      </CardContent>
    </Card>
  );
}

function InsightMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}

function UserInsightCard({ user }: { user: AdminUserInsight }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base leading-tight">
              {user.name || user.email}
            </CardTitle>
            <CardDescription className="truncate">{user.email}</CardDescription>
            <p className="truncate text-xs text-muted-foreground">
              {user.username ? `@${user.username}` : user.clerkUserId}
            </p>
          </div>

          <ActivityBadge bucket={user.activityBucket} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Dias ativos
            </div>
            <div className="mt-1 text-xl font-semibold">
              {formatCount(user.activeDays)}
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Documentos
            </div>
            <div className="mt-1 text-xl font-semibold">
              {formatCount(user.documentsCreated)}
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Conversas
            </div>
            <div className="mt-1 text-xl font-semibold">
              {formatCount(getConversationCount(user))}
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Partilhas
            </div>
            <div className="mt-1 text-xl font-semibold">
              {formatCount(user.resourcesShared)}
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-border/70 bg-background/80 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Ultima atividade</span>
            <span className="text-right font-medium">
              {formatDate(user.lastTrackedActivityAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Clerk ultimo login</span>
            <span className="text-right font-medium">
              {formatDate(user.clerkLastSignInAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Geracoes AI</span>
            <span className="text-right font-medium">
              {formatCount(user.documentGenerationInteractions)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Imagens</span>
            <span className="text-right font-medium">
              {formatCount(getImageCount(user))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, isLoaded } = useAdmin();
  const [insights, setInsights] = useState<Awaited<
    ReturnType<typeof adminUserInsightsService.getUserInsights>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<AdminUserActivityBucket | "all">("all");

  const deferredQuery = useDeferredValue(query);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminUserInsightsService.getUserInsights(true);
      setInsights(response);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Nao foi possivel carregar os insights.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isLoaded, router]);

  useEffect(() => {
    if (!isLoaded || !isAdmin) {
      return;
    }

    void loadInsights();
  }, [isAdmin, isLoaded]);

  const filteredUsers = useMemo(() => {
    const users = insights?.users ?? [];

    return users.filter((user) => {
      if (bucket !== "all" && user.activityBucket !== bucket) {
        return false;
      }

      return matchesSearch(user, deferredQuery);
    });
  }, [bucket, deferredQuery, insights?.users]);

  const summary = insights?.summary;
  const totalUsers = summary?.totalUsers ?? 0;
  const repeatRate =
    totalUsers > 0 ? (100 * (summary?.repeatUsers ?? 0)) / totalUsers : 0;
  const oneTimeRate =
    totalUsers > 0
      ? (100 * (summary?.usersWithSingleActiveDay ?? 0)) / totalUsers
      : 0;
  const inactiveRate =
    totalUsers > 0
      ? (100 * (summary?.usersWithNoTrackedActivity ?? 0)) / totalUsers
      : 0;
  const trackedConversations =
    (summary?.totalDocumentChatInteractions ?? 0) +
    (summary?.totalAssistantChatInteractions ?? 0);

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
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Insights de utilizacao"
          description="Uma vista mais clara sobre retencao, intensidade de uso e sinais por utilizador."
          icon={
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
              <BarChart3 className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
          }
          actions={
            <Button
              variant="outline"
              onClick={() => void loadInsights()}
              disabled={loading}
              className="min-w-[8.5rem]"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          }
        />

        {error && !loading ? (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="gap-2">
              <CardTitle className="text-base">
                Nao foi possivel carregar os insights
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => void loadInsights()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="gap-4 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary"
                >
                  Retencao
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Atividade = docs + AI + partilhas
                </Badge>
              </div>

              <div className="space-y-2">
                <CardTitle className="max-w-3xl text-2xl leading-tight sm:text-3xl">
                  Quem volta ao produto, quem so testa uma vez e quem ainda nao
                  deixou sinais de uso.
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 sm:text-base">
                  Esta vista junta os eventos rastreados na app com
                  enriquecimento opcional do Clerk para ajudar a distinguir
                  exploracao pontual, uso recorrente e contas sincronizadas sem
                  atividade observavel.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="grid gap-3 sm:grid-cols-3">
              <InsightMetric
                label="Voltou"
                value={loading && !insights ? "..." : formatPercent(repeatRate)}
                helper={`${formatCount(summary?.repeatUsers)} utilizadores com 2 ou mais dias ativos.`}
              />
              <InsightMetric
                label="Tentou uma vez"
                value={
                  loading && !insights ? "..." : formatPercent(oneTimeRate)
                }
                helper={`${formatCount(summary?.usersWithSingleActiveDay)} utilizadores com 1 dia ativo.`}
              />
              <InsightMetric
                label="Sem atividade"
                value={
                  loading && !insights ? "..." : formatPercent(inactiveRate)
                }
                helper={`${formatCount(summary?.usersWithNoTrackedActivity)} utilizadores ainda sem rastos no produto.`}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <SummaryStatCard
              icon={<Users className="h-4 w-4" />}
              label="Cobertura dos utilizadores"
              value={loading && !insights ? "..." : formatCount(totalUsers)}
              helper={`${formatCount(summary?.usersWithTrackedActivity)} com atividade rastreada e ${formatCount(summary?.usersWithClerkSignInButNoTrackedActivity)} com login Clerk mas sem atividade local.`}
            />

            <SummaryStatCard
              icon={<Share2 className="h-4 w-4" />}
              label="Clerk e lacunas de sincronizacao"
              value={
                loading && !insights
                  ? "..."
                  : summary?.clerkEnrichmentAvailable
                    ? formatCount(summary?.clerkUsersTotal)
                    : "DB only"
              }
              helper={
                summary?.clerkEnrichmentAvailable
                  ? `${formatCount(summary?.clerkUsersWithoutDatabaseRecord)} utilizadores existem no Clerk sem registo local.`
                  : (summary?.clerkError ??
                    "Enriquecimento Clerk indisponivel nesta execucao.")
              }
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryStatCard
            icon={<Users className="h-4 w-4" />}
            label="Utilizadores com atividade"
            value={
              loading && !insights
                ? "..."
                : formatCount(summary?.usersWithTrackedActivity)
            }
            helper="Contas com pelo menos um documento, evento AI ou partilha."
          />
          <SummaryStatCard
            icon={<FileText className="h-4 w-4" />}
            label="Documentos criados"
            value={
              loading && !insights
                ? "..."
                : formatCount(summary?.totalDocumentsCreated)
            }
            helper={`${formatCount(summary?.totalDocumentGenerationInteractions)} geracoes AI concluídas.`}
          />
          <SummaryStatCard
            icon={<MessageSquare className="h-4 w-4" />}
            label="Conversas rastreadas"
            value={
              loading && !insights ? "..." : formatCount(trackedConversations)
            }
            helper={`${formatCount(summary?.totalDocumentChatInteractions)} no editor e ${formatCount(summary?.totalAssistantChatInteractions)} no assistente.`}
          />
          <SummaryStatCard
            icon={<Bot className="h-4 w-4" />}
            label="Imagens e partilhas"
            value={
              loading && !insights
                ? "..."
                : formatCount(
                    (summary?.totalImageGenerationInteractions ?? 0) +
                      (summary?.totalImageRegenerationInteractions ?? 0) +
                      (summary?.totalResourcesShared ?? 0),
                  )
            }
            helper={`${formatCount(summary?.totalResourcesShared)} partilhas e ${formatCount((summary?.totalImageGenerationInteractions ?? 0) + (summary?.totalImageRegenerationInteractions ?? 0))} interacoes de imagem.`}
          />
        </section>

        <section>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="gap-4 border-b border-border/70 pb-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-xl">
                    Atividade por utilizador
                  </CardTitle>
                  <CardDescription className="max-w-3xl leading-6">
                    &ldquo;Voltou&ldquo; significa atividade em 2 ou mais dias
                    distintos. Aqui tens uma leitura mais operacional de
                    documentos, conversas, partilhas e sinais vindos do Clerk.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />A mostrar{" "}
                  {formatCount(filteredUsers.length)} de{" "}
                  {formatCount(insights?.users.length)}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Pesquisar por email, nome ou Clerk ID"
                    className="h-11 rounded-xl border-border/70 bg-background pl-10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["all", "repeat", "single_day", "inactive"] as const).map(
                    (option) => (
                      <Button
                        key={option}
                        size="sm"
                        variant={bucket === option ? "default" : "outline"}
                        onClick={() => setBucket(option)}
                        className="rounded-full px-4"
                      >
                        {bucketLabels[option]}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              {summary?.clerkEnrichmentEnabled &&
              !summary.clerkEnrichmentAvailable ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  Clerk enrichment indisponivel:{" "}
                  {summary.clerkError ?? "erro desconhecido"}.
                </div>
              ) : null}

              <ResponsiveDataView
                className="w-full"
                mobileCardView={
                  <div className="space-y-3">
                    {loading && !insights ? (
                      <Card className="border-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                          A carregar insights...
                        </CardContent>
                      </Card>
                    ) : filteredUsers.length === 0 ? (
                      <Card className="border-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                          Nenhum utilizador corresponde aos filtros atuais.
                        </CardContent>
                      </Card>
                    ) : (
                      filteredUsers.map((user) => (
                        <UserInsightCard key={user.userId} user={user} />
                      ))
                    )}
                  </div>
                }
                desktopTableView={
                  <div className="overflow-hidden rounded-2xl border border-border/70">
                    <Table>
                      <TableHeader className="bg-muted/35">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-12 px-4">
                            Utilizador
                          </TableHead>
                          <TableHead className="h-12 px-4">Retencao</TableHead>
                          <TableHead className="h-12 px-4">Conteudo</TableHead>
                          <TableHead className="h-12 px-4">Conversas</TableHead>
                          <TableHead className="h-12 px-4">
                            Comunidade
                          </TableHead>
                          <TableHead className="h-12 px-4">
                            Ultima atividade
                          </TableHead>
                          <TableHead className="h-12 px-4">Clerk</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {loading && !insights ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              A carregar insights...
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              Nenhum utilizador corresponde aos filtros atuais.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.userId} className="align-top">
                              <TableCell className="min-w-[17rem] px-4 py-4">
                                <div className="space-y-1.5">
                                  <div className="font-medium leading-tight">
                                    {user.name || user.email}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {user.email}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {user.username
                                      ? `@${user.username}`
                                      : user.clerkUserId}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="min-w-[10rem] px-4 py-4">
                                <div className="space-y-2">
                                  <ActivityBadge bucket={user.activityBucket} />
                                  <div className="text-sm font-medium">
                                    {formatCount(user.activeDays)} dias ativos
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    conta criada{" "}
                                    {formatDate(user.userCreatedAt)}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="min-w-[11rem] px-4 py-4">
                                <div className="space-y-1.5 text-sm">
                                  <div>
                                    {formatCount(user.documentsCreated)}{" "}
                                    documentos
                                  </div>
                                  <div>
                                    {formatCount(
                                      user.documentGenerationInteractions,
                                    )}{" "}
                                    geracoes AI
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCount(getImageCount(user))}{" "}
                                    interacoes de imagem
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="min-w-[10rem] px-4 py-4">
                                <div className="space-y-1.5 text-sm">
                                  <div>
                                    {formatCount(user.documentChatInteractions)}{" "}
                                    chats documento
                                  </div>
                                  <div>
                                    {formatCount(
                                      user.assistantChatInteractions,
                                    )}{" "}
                                    chats assistente
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCount(getConversationCount(user))} no
                                    total
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="min-w-[9rem] px-4 py-4">
                                <div className="space-y-1.5 text-sm">
                                  <div>
                                    {formatCount(user.resourcesShared)}{" "}
                                    partilhas
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCount(user.resourceReuseCount)}{" "}
                                    reutilizacoes
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="min-w-[11rem] px-4 py-4">
                                <div className="space-y-1.5 text-sm">
                                  <div>
                                    {formatDate(user.lastTrackedActivityAt)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    primeira:{" "}
                                    {formatDate(user.firstTrackedActivityAt)}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="min-w-[11rem] px-4 py-4">
                                <div className="space-y-1.5 text-sm">
                                  <div>
                                    {formatDate(user.clerkLastSignInAt)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    ativo: {formatDate(user.clerkLastActiveAt)}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
