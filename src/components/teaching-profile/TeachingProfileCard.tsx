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

/** Remove acentos para pesquisar como o backend e o ETL normalizam. */
function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Agrupa unidades por prefixo comum antes do primeiro travessão.
 *
 * Nos referenciais, uma disciplina aparece como várias unidades com o mesmo
 * prefixo — "Programação em C/C++ - ciclos e decisões", "… - funções e
 * estruturas". A mediana é 25 unidades por curso mas o máximo é 114, e uma
 * lista plana desse tamanho é hostil. Isto recupera boa parte do agrupamento
 * por disciplina sem depender do plano curricular da escola.
 */
function groupUnits(units: VocationalUnit[]): Array<{ prefix: string; units: VocationalUnit[] }> {
  const groups = new Map<string, VocationalUnit[]>();
  for (const unit of units) {
    const separator = unit.designacao.indexOf(" - ");
    const prefix = separator > 8 ? unit.designacao.slice(0, separator) : "";
    const bucket = groups.get(prefix);
    if (bucket) {
      bucket.push(unit);
    } else {
      groups.set(prefix, [unit]);
    }
  }
  // Prefixos com uma só unidade não são um grupo — voltam para a lista solta.
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

  const isProfissional = profile.educationType === "profissional";

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

  // O catálogo de nível 4 são 161 cursos: carrega-se uma vez e filtra-se
  // localmente, para a pesquisa responder sem ida ao servidor por tecla.
  useEffect(() => {
    if (!isProfissional || catalog.length > 0 || catalogError) return;
    let cancelled = false;
    (async () => {
      try {
        const results = await teachingProfileService.searchQualifications("", 4, 200);
        if (!cancelled) setCatalog(results);
      } catch {
        if (!cancelled) {
          setCatalogError(
            "O catálogo de cursos ainda não foi sincronizado. Fala com a equipa."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isProfissional, catalog.length, catalogError]);

  const loadUnits = useCallback(
    async (codigo: string) => {
      if (unitsByCourse[codigo]) return;
      try {
        const units = await teachingProfileService.getUnits(codigo);
        setUnitsByCourse((current) => ({ ...current, [codigo]: units }));
      } catch {
        toast.error("Não foi possível obter as unidades deste curso.");
      }
    },
    [unitsByCourse]
  );

  useEffect(() => {
    profile.courses.forEach((codigo) => void loadUnits(codigo));
  }, [profile.courses, loadUnits]);

  const filtered = useMemo(() => {
    const key = normalize(term);
    if (!key) return catalog.slice(0, 8);
    return catalog
      .filter(
        (q) =>
          normalize(q.designacao).includes(key) ||
          normalize(q.codigo).includes(key) ||
          normalize(q.cnaefLabel ?? "").includes(key)
      )
      .slice(0, 8);
  }, [catalog, term]);

  const statusFor = (codigo: string): IngestionStatus =>
    profile.courseStates.find((c) => c.codigo === codigo)?.ingestionStatus ?? "pending";

  const designacaoFor = (codigo: string): string =>
    profile.courseStates.find((c) => c.codigo === codigo)?.designacao ??
    catalog.find((q) => q.codigo === codigo)?.designacao ??
    codigo;

  const setEducationType = (educationType: EducationType) =>
    setProfile((current) => ({ ...current, educationType }));

  const addCourse = (codigo: string) => {
    if (profile.courses.includes(codigo)) return;
    setProfile((current) => ({ ...current, courses: [...current.courses, codigo] }));
    setTerm("");
    void loadUnits(codigo);
  };

  const removeCourse = (codigo: string) =>
    setProfile((current) => ({
      ...current,
      courses: current.courses.filter((c) => c !== codigo),
      items: current.items.filter((i) => i.qualificationCodigo !== codigo),
    }));

  const toggleUnit = (codigo: string, unit: VocationalUnit) => {
    const exists = profile.items.some(
      (i) => i.qualificationCodigo === codigo && i.code === unit.codigo
    );
    setProfile((current) => ({
      ...current,
      items: exists
        ? current.items.filter(
            (i) => !(i.qualificationCodigo === codigo && i.code === unit.codigo)
          )
        : [
            ...current.items,
            {
              qualificationCodigo: codigo,
              kind: "unit",
              code: unit.codigo,
              label: unit.designacao,
              trainingComponent: "tecnologica",
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
            ["profissional", "Ensino profissional"],
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

      {!isProfissional ? (
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
                      key={qualification.codigo}
                      type="button"
                      onClick={() => addCourse(qualification.codigo)}
                      disabled={profile.courses.includes(qualification.codigo)}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent disabled:opacity-40 border-b border-border last:border-0"
                    >
                      <span className="block text-sm text-foreground">
                        {qualification.designacao}
                      </span>
                      <span className="block text-xs text-muted-foreground font-mono">
                        {qualification.codigo} · {qualification.cnaefLabel}
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
            profile.courses.map((codigo) => {
              const units = unitsByCourse[codigo];
              const selected = new Set(
                profile.items
                  .filter((i) => i.qualificationCodigo === codigo)
                  .map((i) => i.code)
              );
              return (
                <div key={codigo} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {designacaoFor(codigo)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{codigo}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={statusFor(codigo)} />
                      <button
                        type="button"
                        onClick={() => removeCourse(codigo)}
                        aria-label={`Remover ${designacaoFor(codigo)}`}
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
                        <div key={group.prefix || `soltas-${index}`}>
                          {group.prefix && (
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {group.prefix}
                            </p>
                          )}
                          <div className="space-y-1.5">
                            {group.units.map((unit) => (
                              <label
                                key={unit.codigo}
                                className="flex items-start gap-2.5 text-sm cursor-pointer"
                              >
                                <Checkbox
                                  checked={selected.has(unit.codigo)}
                                  onCheckedChange={() => toggleUnit(codigo, unit)}
                                  className="mt-0.5"
                                />
                                <span className="text-foreground">
                                  {unit.designacao}
                                  <span className="text-muted-foreground font-mono text-xs ml-1.5">
                                    {unit.codigo}
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
