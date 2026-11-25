import type { CurriculaOverview, CurriculumFramework } from "@/services/api/admin-curricula.service";

/** One row per country (top-level jurisdiction), with its sub-jurisdictions and their frameworks. */
export interface CountryGroup {
  code: string;
  name: string;
  places: Place[];
  totalItems: number;
}

export interface Place {
  code: string;
  name: string;
  /** True for the country itself ("Nacional"), false for a state or region. */
  national: boolean;
  frameworks: CurriculumFramework[];
  items: number;
}

/** Items in a framework's newest version (the API lists versions newest first). */
export function currentItems(framework: CurriculumFramework): number {
  return framework.versions[0]?.items ?? 0;
}

/**
 * Groups frameworks by the country they apply in: "BR" holds BR itself and BR-MT, BR-MS…, each listing the
 * frameworks that apply there. A framework that applies in several places shows under each.
 */
export function groupByCountry(overview: CurriculaOverview): CountryGroup[] {
  const byCode = new Map(overview.jurisdictions.map((j) => [j.code, j]));
  const countryOf = (code: string): string => {
    let current = byCode.get(code);
    let guard = 0;
    while (current?.parentCode && guard++ < 10) current = byCode.get(current.parentCode);
    return current?.code ?? code.split("-")[0];
  };

  const groups = new Map<string, CountryGroup>();
  for (const framework of overview.frameworks) {
    for (const placeCode of framework.jurisdictions) {
      const country = countryOf(placeCode);
      const group =
        groups.get(country) ??
        { code: country, name: byCode.get(country)?.name ?? country, places: [], totalItems: 0 };
      groups.set(country, group);
      let place = group.places.find((p) => p.code === placeCode);
      if (!place) {
        place = {
          code: placeCode,
          name: byCode.get(placeCode)?.name ?? placeCode,
          national: placeCode === country,
          frameworks: [],
          items: 0,
        };
        group.places.push(place);
      }
      place.frameworks.push(framework);
      place.items += currentItems(framework);
      group.totalItems += currentItems(framework);
    }
  }
  for (const group of groups.values()) {
    // The country itself first, then its states by name.
    group.places.sort((a, b) =>
      a.national !== b.national ? (a.national ? -1 : 1) : a.name.localeCompare(b.name, "pt"),
    );
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export interface Summary {
  countries: number;
  states: number;
  frameworks: number;
  items: number;
  lastLoadedAt: string | null;
}

/** The headline numbers at the top of the tab. */
export function summarize(overview: CurriculaOverview, groups: CountryGroup[]): Summary {
  const loadedAt = overview.frameworks
    .map((f) => f.versions[0]?.loadedAt)
    .filter((value): value is string => !!value)
    .sort();
  return {
    countries: groups.length,
    states: groups.reduce((n, g) => n + g.places.filter((p) => !p.national).length, 0),
    frameworks: overview.frameworks.length,
    items: overview.frameworks.reduce((n, f) => n + currentItems(f), 0),
    lastLoadedAt: loadedAt.at(-1) ?? null,
  };
}

export type Tone = "success" | "info" | "neutral" | "danger";

/** Version states of the curriculum schema, in Portuguese. */
export function versionStateLabel(state: string): { label: string; tone: Tone } {
  switch (state) {
    case "published":
      return { label: "Publicado", tone: "success" };
    case "validated":
      return { label: "Validado", tone: "info" };
    case "draft":
      return { label: "Rascunho", tone: "neutral" };
    case "retired":
      return { label: "Retirado", tone: "neutral" };
    default:
      return { label: state, tone: "neutral" };
  }
}

/** Outcomes of an ETL run, in Portuguese. */
export function runOutcomeLabel(outcome: string): { label: string; tone: Tone } {
  switch (outcome) {
    case "loaded":
      return { label: "Carregado", tone: "success" };
    case "replaced":
      return { label: "Substituído", tone: "info" };
    case "unchanged":
      return { label: "Sem alterações", tone: "neutral" };
    case "rejected":
      return { label: "Rejeitado", tone: "danger" };
    case "failed":
      return { label: "Falhou", tone: "danger" };
    default:
      return { label: outcome, tone: "neutral" };
  }
}

/** Runs that need a look: failed or rejected loads. */
export function isProblemRun(outcome: string): boolean {
  return runOutcomeLabel(outcome).tone === "danger";
}
