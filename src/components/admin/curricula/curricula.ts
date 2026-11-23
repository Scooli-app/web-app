import type { CurriculaOverview, CurriculumFramework } from "@/services/api/admin-curricula.service";

/** One row per country (top-level jurisdiction), with its sub-jurisdictions and their frameworks. */
export interface CountryGroup {
  code: string;
  name: string;
  places: { code: string; name: string; frameworks: CurriculumFramework[] }[];
  totalItems: number;
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
    for (const place of framework.jurisdictions) {
      const country = countryOf(place);
      const group =
        groups.get(country) ??
        { code: country, name: byCode.get(country)?.name ?? country, places: [], totalItems: 0 };
      groups.set(country, group);
      let entry = group.places.find((p) => p.code === place);
      if (!entry) {
        entry = { code: place, name: byCode.get(place)?.name ?? place, frameworks: [] };
        group.places.push(entry);
      }
      entry.frameworks.push(framework);
      group.totalItems += currentItems(framework);
    }
  }
  for (const group of groups.values()) {
    // The country itself first, then its states in code order.
    group.places.sort((a, b) => (a.code === group.code ? -1 : b.code === group.code ? 1 : a.code.localeCompare(b.code)));
  }
  return [...groups.values()].sort((a, b) => a.code.localeCompare(b.code));
}

/** Runs that need a look: failed or rejected loads. */
export function isProblemRun(outcome: string): boolean {
  return outcome === "failed" || outcome === "rejected";
}
