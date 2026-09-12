"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import {
  EMPTY_TEACHING_PROFILE,
  INGESTION_STATUS_LABELS,
  type EducationType,
  type IngestionStatus,
  type Qualification,
  type TeachingItem,
  type TeachingProfile,
  type VocationalUnit,
} from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { Check, GraduationCap, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/** Strip accents so search matches how the backend and ETL normalise. */
function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Group units by the common prefix before the first dash.
 *
 * In referentials a subject shows up as several units sharing a prefix —
 * "Programação em C/C++ - ciclos e decisões", "… - funções e estruturas". The
 * median is 25 units per course but the maximum is 114, and a flat list that
 * long is hostile. This recovers much of the subject grouping without needing
 * the school's own curriculum plan.
 */
function groupUnits(units: VocationalUnit[]): Array<{ prefix: string; units: VocationalUnit[] }> {
  const groups = new Map<string, VocationalUnit[]>();
  for (const unit of units) {
    const separator = unit.title.indexOf(" - ");
    const prefix = separator > 8 ? unit.title.slice(0, separator) : "";
    const bucket = groups.get(prefix);
    if (bucket) {
      bucket.push(unit);
    } else {
      groups.set(prefix, [unit]);
    }
  }
  // A prefix with a single unit is not a group — those go back to the loose list.
  const loose: VocationalUnit[] = [];
  const real: Array<{ prefix: string; units: VocationalUnit[] }> = [];
  for (const [prefix, bucket] of groups) {
    if (!prefix || bucket.length < 2) {
      loose.push(...bucket);
    } else {
      real.push({ prefix, units: bucket });
    }
  }
  if (loose.length > 0) {
    real.push({ prefix: "", units: loose });
  }
  return real;
}

function StatusBadge({ status }: { status: IngestionStatus }) {
  const tone =
    status === "indexed"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : status === "failed"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <Badge variant="secondary" className={cn("font-normal", tone)}>
      {status === "pending" || status === "running" ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : null}
      {INGESTION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TeachingProfileCard() {
  const [profile, setProfile] = useState<TeachingProfile>(EMPTY_TEACHING_PROFILE);
  const [catalog, setCatalog] = useState<Qualification[]>([]);
  const [unitsByCourse, setUnitsByCourse] = useState<Record<string, VocationalUnit[]>>({});
  const [term, setTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const isVocational = profile.educationType === "vocational";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await teachingProfileService.get();
        if (!cancelled) setProfile(loaded);
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar o teu perfil de ensino.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The level-4 catalogue is 161 courses: load it once and filter locally so
  // search responds without a round trip per keystroke.
  useEffect(() => {
    if (!isVocational || catalog.length > 0 || catalogError) return;
    let cancelled = false;
    (async () => {
      try {
        const results = await teachingProfileService.searchQualifications("", 4, 200);
        if (!cancelled) setCatalog(results);
      } catch (error) {
        // apiClient's response interceptor already extracts the backend's real
        // error message (or a specific "wrong API URL" / "network error" one) —
        // surface that instead of guessing a single fixed cause. A silent guess
        // here is actively harmful: it looks identical whether the catalogue is
        // genuinely unsynced, the wrong backend is being hit, or the request
        // never left the browser, so a real failure is undiagnosable from the UI.
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o catálogo de cursos."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isVocational, catalog.length, catalogError]);

  const loadUnits = useCallback(
    async (code: string) => {
      if (unitsByCourse[code]) return;
      try {
        const units = await teachingProfileService.getUnits(code);
        setUnitsByCourse((current) => ({ ...current, [code]: units }));
      } catch {
        toast.error("Não foi possível obter as unidades deste curso.");
      }
    },
    [unitsByCourse]
  );

  useEffect(() => {
    profile.courses.forEach((code) => void loadUnits(code));
  }, [profile.courses, loadUnits]);

  const filtered = useMemo(() => {
    const key = normalize(term);
    if (!key) return catalog.slice(0, 8);
    return catalog
      .filter(
        (q) =>
          normalize(q.title).includes(key) ||
          normalize(q.code).includes(key) ||
          normalize(q.cnaefLabel ?? "").includes(key)
      )
      .slice(0, 8);
  }, [catalog, term]);

  const statusFor = (code: string): IngestionStatus =>
    profile.courseStates.find((c) => c.code === code)?.ingestionStatus ?? "pending";

  const titleFor = (code: string): string =>
    profile.courseStates.find((c) => c.code === code)?.title ??
    catalog.find((q) => q.code === code)?.title ??
    code;

  const setEducationType = (educationType: EducationType) =>
    setProfile((current) => ({ ...current, educationType }));

  const addCourse = (code: string) => {
    if (profile.courses.includes(code)) return;
    setProfile((current) => ({ ...current, courses: [...current.courses, code] }));
    setTerm("");
    void loadUnits(code);
  };

  const removeCourse = (code: string) =>
    setProfile((current) => ({
      ...current,
      courses: current.courses.filter((c) => c !== code),
      items: current.items.filter((i) => i.qualificationCode !== code),
    }));

  const toggleUnit = (courseCode: string, unit: VocationalUnit) => {
    const exists = profile.items.some(
      (i) => i.qualificationCode === courseCode && i.code === unit.code
    );
    setProfile((current) => ({
      ...current,
      items: exists
        ? current.items.filter(
            (i) => !(i.qualificationCode === courseCode && i.code === unit.code)
          )
        : [
            ...current.items,
            {
              qualificationCode: courseCode,
              kind: "unit",
              code: unit.code,
              label: unit.title,
              trainingComponent: "technological",
            } satisfies TeachingItem,
          ],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await teachingProfileService.save(profile);
      setProfile(saved);
      toast.success("Perfil de ensino guardado.");
    } catch {
      toast.error("Não foi possível guardar. Tenta novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card p-4 sm:p-6 md:p-8 rounded-2xl shadow-md border border-border">
        <div className="h-6 bg-muted rounded-lg w-48 animate-pulse mb-4" />
        <div className="h-4 bg-muted rounded-lg w-72 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card p-4 sm:p-6 md:p-8 rounded-2xl shadow-md border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">O Meu Ensino</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        Define uma vez o que lecionas. A Scooli passa a usar o currículo certo
        sem te voltar a perguntar em cada documento.
      </p>

      <div className="flex gap-2 mb-6" role="group" aria-label="Tipo de ensino">
        {(
          [
            ["regular", "Ensino regular"],
            ["vocational", "Ensino profissional"],
          ] as Array<[EducationType, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setEducationType(value)}
            aria-pressed={profile.educationType === value}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
              profile.educationType === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            {profile.educationType === value && (
              <Check className="w-3.5 h-3.5 inline mr-1.5" />
            )}
            {label}
          </button>
        ))}
      </div>

      {!isVocational ? (
        <p className="text-sm text-muted-foreground">
          No ensino regular continuas a escolher disciplina e ano em cada
          documento.
        </p>
      ) : catalogError ? (
        <div className="p-4 bg-destructive/10 rounded-xl">
          <p className="text-destructive text-sm">{catalogError}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="course-search"
              className="text-sm font-medium text-foreground mb-2 block"
            >
              Os teus cursos
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="course-search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Procura por nome, código ou área — ex.: software, 481"
                className="pl-9"
                autoComplete="off"
              />
            </div>

            {term && (
              <div className="mt-2 border border-border rounded-xl overflow-hidden">
                {filtered.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Nenhum curso encontrado. As escolas às vezes usam nomes
                    diferentes do catálogo — procura por uma palavra só.
                  </p>
                ) : (
                  filtered.map((qualification) => (
                    <button
                      key={qualification.code}
                      type="button"
                      onClick={() => addCourse(qualification.code)}
                      disabled={profile.courses.includes(qualification.code)}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent disabled:opacity-40 border-b border-border last:border-0"
                    >
                      <span className="block text-sm text-foreground">
                        {qualification.title}
                      </span>
                      <span className="block text-xs text-muted-foreground font-mono">
                        {qualification.code} · {qualification.cnaefLabel}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {profile.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não escolheste nenhum curso.
            </p>
          ) : (
            profile.courses.map((code) => {
              const units = unitsByCourse[code];
              const selected = new Set(
                profile.items
                  .filter((i) => i.qualificationCode === code)
                  .map((i) => i.code)
              );
              return (
                <div key={code} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {titleFor(code)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{code}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={statusFor(code)} />
                      <button
                        type="button"
                        onClick={() => removeCourse(code)}
                        aria-label={`Remover ${titleFor(code)}`}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">
                    Marca as unidades que lecionas. Na componente tecnológica o
                    catálogo nacional não define disciplinas — são as escolas que
                    agrupam estas unidades.
                  </p>

                  {!units ? (
                    <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {groupUnits(units).map((group, index) => (
                        <div key={group.prefix || `loose-${index}`}>
                          {group.prefix && (
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {group.prefix}
                            </p>
                          )}
                          <div className="space-y-1.5">
                            {group.units.map((unit) => (
                              <label
                                key={unit.code}
                                className="flex items-start gap-2.5 text-sm cursor-pointer"
                              >
                                <Checkbox
                                  checked={selected.has(unit.code)}
                                  onCheckedChange={() => toggleUnit(code, unit)}
                                  className="mt-0.5"
                                />
                                <span className="text-foreground">
                                  {unit.title}
                                  <span className="text-muted-foreground font-mono text-xs ml-1.5">
                                    {unit.code}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-medium"
          >
            {isSaving ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      )}
    </div>
  );
}
