"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  AdminSchool,
  AdminSchoolsOverview,
} from "@/services/api/admin-onboarding.service";
import { cn } from "@/shared/utils/utils";
import { ChevronDown, ChevronRight, Filter, School, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { TEACHER_ROLE_LABELS } from "./labels";

const INITIAL_VISIBLE = 12;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

interface SchoolsCardProps {
  data: AdminSchoolsOverview | null;
  /** Name of the school currently filtering the responses table, if any. */
  activeSchool: string | null;
  onSelectTeacher: (userId: string) => void;
  onFilterSchool: (school: AdminSchool | null) => void;
}

export function SchoolsCard({
  data,
  activeSchool,
  onSelectTeacher,
  onFilterSchool,
}: SchoolsCardProps) {
  const [query, setQuery] = useState("");
  const [multiOnly, setMultiOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const schools = useMemo(() => {
    const needle = normalize(query.trim());
    return (data?.schools ?? []).filter((school) => {
      if (multiOnly && school.teacherCount < 2) return false;
      if (!needle) return true;
      return (
        normalize(school.name).includes(needle) ||
        school.variants.some((v) => normalize(v.name).includes(needle)) ||
        school.teachers.some(
          (t) =>
            normalize(t.name ?? "").includes(needle) ||
            normalize(t.email).includes(needle),
        )
      );
    });
  }, [data, query, multiOnly]);

  const multiTeacherSchools = (data?.schools ?? []).filter(
    (s) => s.teacherCount >= 2,
  ).length;
  const filtering = Boolean(query) || multiOnly;
  const visible =
    showAll || filtering ? schools : schools.slice(0, INITIAL_VISIBLE);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            Escolas
          </CardTitle>
          {data && (
            <p className="text-xs text-muted-foreground">
              {`${data.schools.length} escolas · ${multiTeacherSchools} com 2+ professores · ${data.teachersWithoutSchool} sem escola`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar escola, professor ou email"
              className="pl-8"
            />
          </div>
          <Button
            variant={multiOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setMultiOnly((v) => !v)}
          >
            2+ professores
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            A carregar escolas…
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            Nenhuma escola encontrada.
          </div>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
            {visible.map((school) => {
              const isOpen = expanded === school.name;
              const isActive = activeSchool === school.name;
              return (
                <li key={school.name} className={cn(isActive && "bg-primary/5")}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : school.name)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {school.name}
                      </span>
                      {school.variants.length > 1 && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {`${school.variants.length} grafias agrupadas`}
                        </span>
                      )}
                    </span>
                    {school.teacherCount >= 2 && (
                      <Badge className="shrink-0 text-xs">Multi-professor</Badge>
                    )}
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {school.teacherCount}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-border/60 bg-muted/20 px-4 py-3">
                      {school.variants.length > 1 && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Como escreveram
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {school.variants.map((v) => (
                              <Badge
                                key={v.name}
                                variant="outline"
                                className="text-xs"
                              >
                                {`"${v.name}"${v.count > 1 ? ` ×${v.count}` : ""}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Professores
                        </p>
                        <ul className="space-y-1">
                          {school.teachers.map((teacher) => (
                            <li key={teacher.userId}>
                              <button
                                type="button"
                                onClick={() => onSelectTeacher(teacher.userId)}
                                className="flex w-full flex-wrap items-baseline gap-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-background"
                              >
                                <span className="font-medium">
                                  {teacher.name || teacher.email}
                                </span>
                                {teacher.name && (
                                  <span className="text-xs text-muted-foreground">
                                    {teacher.email}
                                  </span>
                                )}
                                {teacher.teacherRole && (
                                  <span className="text-xs text-muted-foreground">
                                    {TEACHER_ROLE_LABELS[teacher.teacherRole] ??
                                      teacher.teacherRole}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFilterSchool(isActive ? null : school)}
                      >
                        <Filter className="mr-2 h-3.5 w-3.5" />
                        {isActive
                          ? "Remover filtro"
                          : "Filtrar respostas desta escola"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data && !showAll && !filtering && schools.length > INITIAL_VISIBLE && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => setShowAll(true)}
          >
            {`Ver todas (${schools.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
