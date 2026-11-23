import type { SourceDefault } from "@/shared/types/sources";

export interface SchoolDefaults {
  organizationId: string;
  organizationName: string;
  entries: SourceDefault[];
}

/** Splits the defaults list into the Fontes page sections; schools by name, entries in server order. */
export function groupSourceDefaults(entries: SourceDefault[]) {
  const curriculum = entries.filter((e) => e.kind === "ae");
  const regulatory = entries.filter((e) => e.kind === "regulatory");
  const byOrg = new Map<string, SchoolDefaults>();
  for (const e of entries) {
    if (e.kind !== "organization" || !e.organizationId) continue;
    const school = byOrg.get(e.organizationId) ?? {
      organizationId: e.organizationId,
      organizationName: e.organizationName ?? "",
      entries: [],
    };
    school.entries.push(e);
    byOrg.set(e.organizationId, school);
  }
  const schools = [...byOrg.values()].sort((a, b) => a.organizationName.localeCompare(b.organizationName));
  const personalByRef: Record<string, SourceDefault> = {};
  for (const e of entries) if (e.kind === "personal") personalByRef[e.sourceRef] = e;
  return { curriculum, regulatory, schools, personalByRef };
}
