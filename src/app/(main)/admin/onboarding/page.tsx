"use client";

import { useDateFnsLocale } from "@/i18n/dateFns";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchoolsCard } from "@/components/admin/onboarding/SchoolsCard";
import { TeacherDetailSheet } from "@/components/admin/onboarding/TeacherDetailSheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBars } from "@/components/admin/RankedBars";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminOnboardingService,
  type AdminOnboardingOverview,
  type AdminOnboardingResponse,
  type AdminSchool,
  type AdminSchoolsOverview,
} from "@/services/api/admin-onboarding.service";
import {
  CLASS_COUNT_LABELS,
  CURRENT_TOOLS_LABELS,
  PREP_HOURS_LABELS,
  getAcquisitionLabel,
  getGoalLabel,
  getLevelLabel,
  getSubjectLabel,
  parseCommaSeparated,
} from "@/components/admin/onboarding/labels";
import {
  BaselineCell,
  ProfileCell,
} from "@/components/admin/onboarding/ProfileCells";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const percentFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 1,
});

const metricCardClassName =
  "bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70";

function formatPercentage(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

type FilterKind = "source" | "subject" | "level" | "goal" | "school";

interface ActiveFilter {
  kind: FilterKind;
  key: string;
  label: string;
  /** Only for school filters: users belonging to the school group. */
  userIds?: Set<string>;
}

const FILTER_KIND_LABELS: Record<FilterKind, string> = {
  source: "Fonte",
  subject: "Disciplina",
  level: "Nível",
  goal: "Objetivo",
  school: "Escola",
};

function matchesFilter(response: AdminOnboardingResponse, filter: ActiveFilter) {
  switch (filter.kind) {
    case "source":
      return response.acquisitionSource === filter.key;
    case "subject":
      return parseCommaSeparated(response.subjectArea).includes(filter.key);
    case "level":
      return parseCommaSeparated(response.teachingLevel).includes(filter.key);
    case "goal":
      return parseCommaSeparated(response.goals).includes(filter.key);
    case "school":
      return filter.userIds?.has(response.userId) ?? false;
  }
}

function matchesSearch(response: AdminOnboardingResponse, needle: string) {
  const haystack = [
    response.userName,
    response.userUsername,
    response.userEmail,
    response.schoolName,
    response.subjectArea,
    response.goals,
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
  return haystack.includes(needle);
}

type SortField = "user" | "source" | "date";
type SortDir = "asc" | "desc";

function SortableHead({
  field,
  label,
  current,
  dir,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}

function sortResponses(
  responses: AdminOnboardingResponse[],
  field: SortField,
  dir: SortDir,
): AdminOnboardingResponse[] {
  return [...responses].sort((a, b) => {
    let cmp = 0;
    if (field === "user") {
      const nameA = (a.userName || a.userUsername || a.userEmail).toLowerCase();
      const nameB = (b.userName || b.userUsername || b.userEmail).toLowerCase();
      cmp = nameA.localeCompare(nameB);
    } else if (field === "source") {
      cmp = (a.acquisitionSource ?? "").localeCompare(b.acquisitionSource ?? "");
    } else if (field === "date") {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function AdminOnboardingPage() {
  const dateFnsLocale = useDateFnsLocale();
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOnboardingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [schools, setSchools] = useState<AdminSchoolsOverview | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActiveFilter | null>(null);
  const [search, setSearch] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [data, schoolsData] = await Promise.all([
        adminOnboardingService.getOverview(),
        adminOnboardingService.getSchools().catch(() => null),
      ]);
      setOverview(data);
      setSchools(schoolsData);
    } catch {
      toast.error("Erro ao carregar dados do onboarding.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const acquisitionData =
    overview?.acquisitionSourceBreakdown.map((item) => ({
      ...item,
      label: getAcquisitionLabel(item.key),
    })) ?? [];

  const subjectData =
    overview?.subjectAreaBreakdown.map((item) => ({
      ...item,
      label: getSubjectLabel(item.key),
    })) ?? [];

  const levelData =
    overview?.teachingLevelBreakdown.map((item) => ({
      ...item,
      label: getLevelLabel(item.key),
    })) ?? [];

  const goalsData =
    overview?.goalsBreakdown?.map((item) => ({
      ...item,
      label: getGoalLabel(item.key),
    })) ?? [];


  const baselineCards = [
    {
      title: "Horas por Semana a Preparar Aulas",
      items: overview?.prepHoursBreakdown,
      labels: PREP_HOURS_LABELS,
      color: "var(--chart-2)",
    },
    {
      title: "O que Usam para Preparar Aulas",
      items: overview?.currentToolsBreakdown,
      labels: CURRENT_TOOLS_LABELS,
      color: "var(--chart-3)",
    },
    {
      title: "Número de Turmas",
      items: overview?.classCountBreakdown,
      labels: CLASS_COUNT_LABELS,
      color: "var(--chart-5)",
    },
  ].map((card) => ({
    ...card,
    data: (card.items ?? []).map((item) => ({ ...item, label: card.labels[item.key] ?? item.key })),
  }));

  const toggleFilter = (kind: FilterKind, key: string, label: string) =>
    setFilter((current) =>
      current?.kind === kind && current.key === key
        ? null
        : { kind, key, label },
    );

  const handleSchoolFilter = (school: AdminSchool | null) =>
    setFilter(
      school
        ? {
            kind: "school",
            key: school.name,
            label: school.name,
            userIds: new Set(school.teachers.map((t) => t.userId)),
          }
        : null,
    );

  const allResponses = overview?.recentResponses;
  const responses = useMemo(() => {
    const needle = search
      .trim()
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase();
    const filtered = (allResponses ?? []).filter(
      (r) =>
        (!filter || matchesFilter(r, filter)) &&
        (!needle || matchesSearch(r, needle)),
    );
    return sortResponses(filtered, sortField, sortDir);
  }, [allResponses, filter, search, sortField, sortDir]);

  const selectedResponses = useMemo(
    () => (allResponses ?? []).filter((r) => r.userId === selectedUserId),
    [allResponses, selectedUserId],
  );
  const selectedTeacher = useMemo(() => {
    if (!selectedUserId) return null;
    for (const school of schools?.schools ?? []) {
      const teacher = school.teachers.find((t) => t.userId === selectedUserId);
      if (teacher) return teacher;
    }
    return null;
  }, [schools, selectedUserId]);

  const mobileResponses = (
    <div className="space-y-3">
      {responses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          Ainda não existem respostas ao onboarding.
        </div>
      ) : (
        responses.map((response) => {
          const displayName =
            response.userName || response.userUsername || response.userEmail;
          const subjects = parseCommaSeparated(response.subjectArea);
          const levels = parseCommaSeparated(response.teachingLevel);
          const goals = parseCommaSeparated(response.goals);
          return (
            <div
              key={response.id}
              onClick={() => setSelectedUserId(response.userId)}
              className="cursor-pointer rounded-xl border border-border/70 bg-card/80 p-4 hover:bg-muted/40"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {response.userEmail}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format(new Date(response.createdAt), "dd MMM yyyy", {
                    locale: dateFnsLocale,
                  })}
                </span>
              </div>
              {response.version === "v2" && (
                <div className="mb-3 space-y-1">
                  <ProfileCell response={response} />
                  <BaselineCell response={response} />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {response.acquisitionSource && (
                  <Badge variant="outline" className="border-primary/20 bg-primary/8 text-primary text-xs">
                    {getAcquisitionLabel(response.acquisitionSource)}
                  </Badge>
                )}
                {subjects.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {getSubjectLabel(s)}
                  </Badge>
                ))}
                {levels.map((l) => (
                  <Badge key={l} variant="secondary" className="text-xs">
                    {getLevelLabel(l)}
                  </Badge>
                ))}
                {goals.map((g) => (
                  <Badge key={g} variant="outline" className="border-violet-400/30 bg-violet-400/8 text-xs text-violet-700 dark:text-violet-300">
                    {getGoalLabel(g)}
                  </Badge>
                ))}
              </div>
              {(response.acquisitionSourceOther ?? response.subjectAreaOther) && (
                <div className="mt-2 space-y-0.5">
                  {response.acquisitionSourceOther && (
                    <p className="text-xs text-muted-foreground italic">
                      {`Como nos encontrou: "${response.acquisitionSourceOther}"`}
                    </p>
                  )}
                  {response.subjectAreaOther && (
                    <p className="text-xs text-muted-foreground italic">
                      {`Disciplina: "${response.subjectAreaOther}"`}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const desktopResponses = (
    <div className="rounded-xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead field="user" label="Utilizador" current={sortField} dir={sortDir} onSort={handleSort} />
            <SortableHead field="source" label="Como nos encontrou" current={sortField} dir={sortDir} onSort={handleSort} />
            <TableHead>Perfil</TableHead>
            <TableHead>Preparação</TableHead>
            <TableHead>Disciplina</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Objetivos</TableHead>
            <SortableHead field="date" label="Data" current={sortField} dir={sortDir} onSort={handleSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-24 text-center text-muted-foreground"
              >
                Ainda não existem respostas ao onboarding.
              </TableCell>
            </TableRow>
          ) : (
            responses.map((response) => {
              const displayName =
                response.userName ||
                response.userUsername ||
                response.userEmail;
              const subjects = parseCommaSeparated(response.subjectArea);
              const levels = parseCommaSeparated(response.teachingLevel);
              const goals = parseCommaSeparated(response.goals);
              return (
                <TableRow
                  key={response.id}
                  onClick={() => setSelectedUserId(response.userId)}
                  className="cursor-pointer"
                >
                  <TableCell className="max-w-[220px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {displayName}
                        {response.version === "v2" && (
                          <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                            v2
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {response.userEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {response.acquisitionSource ? (
                        <Badge
                          variant="outline"
                          className="border-primary/20 bg-primary/8 text-primary text-xs w-fit"
                        >
                          {getAcquisitionLabel(response.acquisitionSource)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {response.acquisitionSourceOther && (
                        <span className="text-xs text-muted-foreground italic">
                          {`"${response.acquisitionSourceOther}"`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProfileCell response={response} />
                  </TableCell>
                  <TableCell>
                    <BaselineCell response={response} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {subjects.length === 0 && !response.subjectAreaOther ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {subjects.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {getSubjectLabel(s)}
                            </Badge>
                          ))}
                        </div>
                        {response.subjectAreaOther && (
                          <span className="text-xs text-muted-foreground italic">
                            {`"${response.subjectAreaOther}"`}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {levels.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {levels.map((l) => (
                          <Badge key={l} variant="secondary" className="text-xs">
                            {getLevelLabel(l)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {goals.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {goals.map((g) => (
                          <Badge
                            key={g}
                            variant="outline"
                            className="border-violet-400/30 bg-violet-400/8 text-xs text-violet-700 dark:text-violet-300"
                          >
                            {getGoalLabel(g)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(
                      new Date(response.createdAt),
                      "dd MMM yyyy HH:mm",
                      { locale: dateFnsLocale },
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <PageContainer size="7xl" contentClassName="py-4 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Onboarding"
          description="Respostas do onboarding de novos utilizadores (v1 e v2) — aquisição, escola, função, disciplinas, anos e objetivos."
          icon={<MapPin className="h-6 w-6 text-primary" />}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button variant="outline" size="sm" onClick={loadOverview}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </>
          }
        />

        {loading && !overview ? (
          <div className="flex min-h-[40dvh] items-center justify-center rounded-2xl border border-border/70 bg-card/60">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : overview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Utilizadores Acompanhados
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overview.summary.trackedUsers}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overview.summary.completed} completaram o onboarding
                  </p>
                </CardContent>
              </Card>

              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Respostas Recebidas
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overview.summary.responses}
                  </div>
                </CardContent>
              </Card>

              <Card className={metricCardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Conclusão
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(overview.summary.completionRate)}
                  </div>
                  {overview.summary.topAcquisitionSource && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Fonte principal:{" "}
                      {getAcquisitionLabel(overview.summary.topAcquisitionSource)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <SchoolsCard
              data={schools}
              activeSchool={filter?.kind === "school" ? filter.key : null}
              onSelectTeacher={setSelectedUserId}
              onFilterSchool={handleSchoolFilter}
            />

            <Card>
              <CardHeader>
                <CardTitle>Como nos Encontraram</CardTitle>
              </CardHeader>
              <CardContent>
                {acquisitionData.length === 0 ? (
                  <EmptyChartState message="Ainda não existem respostas." />
                ) : (
                  <RankedBars
                    items={acquisitionData}
                    total={overview.summary.responses}
                    color="var(--chart-1)"
                    sortDesc
                    activeKey={filter?.kind === "source" ? filter.key : null}
                    onItemClick={(key) => toggleFilter("source", key, getAcquisitionLabel(key))}
                  />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Disciplina</CardTitle>
                </CardHeader>
                <CardContent>
                  {subjectData.length === 0 ? (
                    <EmptyChartState message="Nenhuma disciplina registada ainda." />
                  ) : (
                    <RankedBars
                      items={subjectData}
                      total={overview.summary.responses}
                      color="var(--chart-2)"
                      sortDesc
                      activeKey={filter?.kind === "subject" ? filter.key : null}
                      onItemClick={(key) => toggleFilter("subject", key, getSubjectLabel(key))}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nível de Ensino</CardTitle>
                </CardHeader>
                <CardContent>
                  {levelData.length === 0 ? (
                    <EmptyChartState message="Nenhum nível de ensino registado ainda." />
                  ) : (
                    <RankedBars
                      items={levelData}
                      total={overview.summary.responses}
                      color="var(--chart-3)"
                      sortDesc
                      activeKey={filter?.kind === "level" ? filter.key : null}
                      onItemClick={(key) => toggleFilter("level", key, getLevelLabel(key))}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>O que Procuram na Scooli</CardTitle>
              </CardHeader>
              <CardContent>
                {goalsData.length === 0 ? (
                  <EmptyChartState message="Nenhum objetivo registado ainda." />
                ) : (
                  <RankedBars
                    items={goalsData}
                    total={overview.summary.responses}
                    color="var(--chart-4)"
                    sortDesc
                    activeKey={filter?.kind === "goal" ? filter.key : null}
                    onItemClick={(key) => toggleFilter("goal", key, getGoalLabel(key))}
                  />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
              {baselineCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader>
                    <CardTitle>{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {card.data.length === 0 ? (
                      <EmptyChartState message="Ainda não existem respostas." />
                    ) : (
                      <RankedBars items={card.data} total={overview.summary.responses} color={card.color} sortDesc />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="gap-3">
                <CardTitle>
                  {`Respostas (${responses.length}${
                    responses.length !== (allResponses?.length ?? 0)
                      ? ` de ${allResponses?.length ?? 0}`
                      : ""
                  })`}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Procurar por nome, email, escola…"
                      className="pl-8"
                    />
                  </div>
                  {filter && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setFilter(null)}
                    >
                      {`${FILTER_KIND_LABELS[filter.kind]}: ${filter.label}`}
                      <X className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Clica numa barra dos gráficos ou numa escola para filtrar; clica numa linha para ver as respostas completas.
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveDataView
                  mobileCardView={mobileResponses}
                  desktopTableView={desktopResponses}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            Não foi possível carregar os dados do onboarding.
          </div>
        )}
      </div>
      <TeacherDetailSheet
        userId={selectedUserId}
        responses={selectedResponses}
        teacher={selectedTeacher}
        onClose={() => setSelectedUserId(null)}
      />
    </PageContainer>
  );
}
