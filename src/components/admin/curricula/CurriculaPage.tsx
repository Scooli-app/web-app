"use client";

import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/shared/utils/utils";
import { adminCurriculaService, type CurriculaOverview } from "@/services/api/admin-curricula.service";
import { BookOpen, Flag, History, Landmark, Layers, MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  currentItems,
  groupByCountry,
  runOutcomeLabel,
  summarize,
  versionStateLabel,
  type CountryGroup,
  type Place,
  type Tone,
} from "./curricula";

const numberFormat = new Intl.NumberFormat("pt-PT");

/**
 * One column template for every framework row on the page, so Versão, Estado, Itens and Carregado line up across
 * the national and state sections (separate tables sized each section's columns differently).
 */
const FRAMEWORK_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_7rem_9rem_8.5rem] sm:items-center sm:gap-4";
const RUN_GRID = "sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem_5rem] sm:items-center sm:gap-4";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400",
  neutral: "bg-muted text-muted-foreground ring-border",
  danger: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400",
};

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_CLASSES[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label}
    </span>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatRelative(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

function StatTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-0 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

function ColumnHeads({ grid, heads }: { grid: string; heads: { label: string; align?: "right" }[] }) {
  return (
    <div className={cn("hidden px-4 pb-2 text-xs font-medium text-muted-foreground", grid)}>
      {heads.map((head) => (
        <span key={head.label} className={head.align === "right" ? "text-right" : undefined}>
          {head.label}
        </span>
      ))}
    </div>
  );
}

function PlaceSection({ place, maxItems }: { place: Place; maxItems: number }) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        {place.national ? (
          <Landmark className="h-4 w-4 text-primary" aria-hidden />
        ) : (
          <MapPinned className="h-4 w-4 text-primary" aria-hidden />
        )}
        <h3 className="text-sm font-semibold text-foreground">{place.national ? "Nacional" : place.name}</h3>
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {place.code}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {place.frameworks.length} {place.frameworks.length === 1 ? "documento" : "documentos"} ·{" "}
          <span className="font-medium tabular-nums text-foreground">{numberFormat.format(place.items)}</span> itens
        </span>
      </header>
      <ul className="divide-y divide-border">
        {place.frameworks.map((framework) => {
          const version = framework.versions[0];
          const items = currentItems(framework);
          const state = version ? versionStateLabel(version.state) : null;
          return (
            <li key={framework.key} className={cn("space-y-2 px-4 py-3 sm:space-y-0", FRAMEWORK_GRID)}>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-foreground">{framework.title}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{framework.key}</p>
              </div>
              <p className="text-sm tabular-nums text-foreground">
                <span className="text-xs text-muted-foreground sm:hidden">Versão </span>
                {version?.label ?? "—"}
              </p>
              <div>{state ? <StatusPill label={state.label} tone={state.tone} /> : <span>—</span>}</div>
              <div className="flex items-center gap-2 sm:justify-end">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${maxItems > 0 ? Math.max(4, (items / maxItems) * 100) : 0}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-medium tabular-nums text-foreground">
                  {numberFormat.format(items)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground" title={version?.loadedAt ?? undefined}>
                {formatDateTime(version?.loadedAt ?? null)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CountryCard({ group }: { group: CountryGroup }) {
  const maxItems = Math.max(0, ...group.places.flatMap((p) => p.frameworks.map(currentItems)));
  const states = group.places.filter((p) => !p.national).length;
  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 pb-3 pt-5">
        <h2 className="text-lg font-semibold text-foreground">{group.name}</h2>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">
          {group.code}
        </span>
        <p className="text-sm text-muted-foreground">
          {states > 0 ? `nacional + ${states} ${states === 1 ? "estado" : "estados"} · ` : ""}
          <span className="font-medium tabular-nums text-foreground">{numberFormat.format(group.totalItems)}</span> itens
        </p>
      </div>
      <div className="px-5 pb-5">
        <ColumnHeads
          grid={FRAMEWORK_GRID}
          heads={[
            { label: "Documento" },
            { label: "Versão" },
            { label: "Estado" },
            { label: "Itens", align: "right" },
            { label: "Carregado" },
          ]}
        />
        <div className="space-y-3">
          {group.places.map((place) => (
            <PlaceSection key={place.code} place={place} maxItems={maxItems} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function RunsCard({ overview }: { overview: CurriculaOverview }) {
  const withMessages = overview.runs.filter((run) => run.message);
  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center gap-2 px-5 pb-3 pt-5">
        <History className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">Últimas execuções do ETL</h2>
      </div>
      <div className="px-5 pb-5">
        {overview.runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem execuções registadas.</p>
        ) : (
          <>
            <ColumnHeads
              grid={RUN_GRID}
              heads={[{ label: "Quando" }, { label: "Fonte" }, { label: "Resultado" }, { label: "Itens", align: "right" }]}
            />
            <ul className="divide-y divide-border rounded-xl border border-border">
              {overview.runs.map((run) => {
                const outcome = runOutcomeLabel(run.outcome);
                return (
                  <li key={run.id} className={cn("space-y-1 px-4 py-3 sm:space-y-0", RUN_GRID)}>
                    <p className="text-sm text-foreground" title={run.startedAt ?? undefined}>
                      {formatRelative(run.startedAt)}
                      <span className="block text-[11px] text-muted-foreground">{formatDateTime(run.startedAt)}</span>
                    </p>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        <span className="font-medium">{run.adapter}</span>
                        {run.source ? <span className="text-muted-foreground"> / {run.source}</span> : null}
                      </p>
                      {run.message ? <p className="truncate text-xs text-red-600">{run.message}</p> : null}
                    </div>
                    <div>
                      <StatusPill label={outcome.label} tone={outcome.tone} />
                    </div>
                    <p className="text-sm font-medium tabular-nums text-foreground sm:text-right">
                      {run.items === null || run.items === undefined ? "—" : numberFormat.format(run.items)}
                    </p>
                  </li>
                );
              })}
            </ul>
            {withMessages.length === 0 ? null : (
              <p className="mt-2 text-xs text-muted-foreground">
                {withMessages.length} {withMessages.length === 1 ? "execução com mensagem" : "execuções com mensagem"}.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
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
  const summary = useMemo(() => (overview ? summarize(overview, groups) : null), [overview, groups]);

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
      ) : !overview || !summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={<Flag className="h-3.5 w-3.5" />}
              label="Países"
              value={numberFormat.format(summary.countries)}
              hint={summary.states > 0 ? `+ ${summary.states} ${summary.states === 1 ? "estado" : "estados"}` : undefined}
            />
            <StatTile
              icon={<Layers className="h-3.5 w-3.5" />}
              label="Documentos curriculares"
              value={numberFormat.format(summary.frameworks)}
            />
            <StatTile
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label="Itens"
              value={numberFormat.format(summary.items)}
              hint="habilidades, objetivos e competências"
            />
            <StatTile
              icon={<History className="h-3.5 w-3.5" />}
              label="Última carga"
              value={formatRelative(summary.lastLoadedAt)}
              hint={formatDateTime(summary.lastLoadedAt)}
            />
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhum currículo carregado"
              description="Corre uma tarefa curriculum_run_adapter no Render Workflows para carregar um país."
            />
          ) : (
            groups.map((group) => <CountryCard key={group.code} group={group} />)
          )}

          <RunsCard overview={overview} />
        </div>
      )}
    </PageContainer>
  );
}
