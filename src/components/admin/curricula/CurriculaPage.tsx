"use client";

import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/hooks/useAdmin";
import { adminCurriculaService, type CurriculaOverview } from "@/services/api/admin-curricula.service";
import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { currentItems, groupByCountry, isProblemRun } from "./curricula";

const numberFormat = new Intl.NumberFormat("pt-PT");

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Admin "Currículos": which official curricula are loaded per country and state, with item counts, and the latest
 * ETL runs. Read-only; loading happens in the ETL repo (Render Workflows tasks). Admin pages are pt-PT only.
 */
export function CurriculaPage() {
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();
  const [overview, setOverview] = useState<CurriculaOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setFailed(false);
    adminCurriculaService
      .getOverview()
      .then((loaded) => {
        if (!cancelled) setOverview(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, attempt]);

  const groups = useMemo(() => (overview ? groupByCountry(overview) : []), [overview]);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Currículos"
        description="Currículos oficiais carregados por país e estado, e as últimas execuções do ETL."
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <BookOpen className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
        actions={<AdminBackButton />}
      />

      {failed ? (
        <LoadError message="Não foi possível carregar os currículos." onRetry={() => setAttempt((n) => n + 1)} />
      ) : !overview ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhum currículo carregado"
              description="Corre uma tarefa curriculum_run_adapter no Render Workflows para carregar um país."
            />
          ) : (
            groups.map((group) => (
              <Card key={group.code}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                    {group.name}
                    <Badge variant="secondary">{group.code}</Badge>
                    <span className="text-sm font-normal text-muted-foreground">
                      {numberFormat.format(group.totalItems)} itens
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.places.map((place) => (
                    <div key={place.code} className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {place.code === group.code ? "Nacional" : place.name}
                        <span className="ml-2 text-xs text-muted-foreground">{place.code}</span>
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                          <thead className="text-left text-xs text-muted-foreground">
                            <tr>
                              <th className="py-1 pr-3 font-medium">Framework</th>
                              <th className="py-1 pr-3 font-medium">Versão</th>
                              <th className="py-1 pr-3 font-medium">Estado</th>
                              <th className="py-1 pr-3 text-right font-medium">Itens</th>
                              <th className="py-1 font-medium">Carregado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {place.frameworks.map((framework) => {
                              const version = framework.versions[0];
                              return (
                                <tr key={framework.key} className="border-t border-border">
                                  <td className="py-2 pr-3">
                                    <p className="text-foreground">{framework.title}</p>
                                    <p className="text-xs text-muted-foreground">{framework.key}</p>
                                  </td>
                                  <td className="py-2 pr-3">{version?.label ?? "—"}</td>
                                  <td className="py-2 pr-3">
                                    {version ? <Badge variant="outline">{version.state}</Badge> : "—"}
                                  </td>
                                  <td className="py-2 pr-3 text-right tabular-nums">
                                    {numberFormat.format(currentItems(framework))}
                                  </td>
                                  <td className="py-2 text-muted-foreground">
                                    {formatDateTime(version?.loadedAt ?? null)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Últimas execuções do ETL</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem execuções registadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3 font-medium">Quando</th>
                        <th className="py-1 pr-3 font-medium">Adaptador / fonte</th>
                        <th className="py-1 pr-3 font-medium">Resultado</th>
                        <th className="py-1 pr-3 text-right font-medium">Itens</th>
                        <th className="py-1 font-medium">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.runs.map((run) => (
                        <tr key={run.id} className="border-t border-border align-top">
                          <td className="py-2 pr-3 text-muted-foreground">{formatDateTime(run.startedAt)}</td>
                          <td className="py-2 pr-3">
                            {run.adapter}
                            {run.source ? <span className="text-muted-foreground"> / {run.source}</span> : null}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant={isProblemRun(run.outcome) ? "destructive" : "outline"}>{run.outcome}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {run.items === null || run.items === undefined ? "—" : numberFormat.format(run.items)}
                          </td>
                          <td className="py-2 text-muted-foreground">{run.message || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
