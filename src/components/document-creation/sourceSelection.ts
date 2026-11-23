import type { SourceDefault } from "@/shared/types/sources";

const indexedSchool = (e: SourceDefault) => e.kind === "organization" && e.status === "indexed";

/** Empty tags = all; a form with no subject or year matches only untagged. Same rule as the backend's SchoolSourceTags. */
function matchesForm(e: SourceDefault, subjectValue?: string, schoolYear?: number): boolean {
  const subjectOk = e.subjects.length === 0 || (!!subjectValue && e.subjects.includes(subjectValue));
  const yearOk = e.schoolYears.length === 0 || (!!schoolYear && e.schoolYears.includes(schoolYear));
  return subjectOk && yearOk;
}

export function orderSchoolSources(
  entries: SourceDefault[],
  subjectValue: string | undefined,
  schoolYear: number | undefined,
): { matching: SourceDefault[]; others: SourceDefault[] } {
  const school = entries.filter(indexedSchool);
  return {
    matching: school.filter((e) => matchesForm(e, subjectValue, schoolYear)),
    others: school.filter((e) => !matchesForm(e, subjectValue, schoolYear)),
  };
}

/** The teacher's defaults as the form's sourceIds: enabled indexed personal, plus enabled school sources that match. */
export function defaultSourceIds(entries: SourceDefault[], subjectValue?: string, schoolYear?: number): string[] {
  return entries
    .filter(
      (e) =>
        e.effectiveDefault &&
        e.status === "indexed" &&
        (e.kind === "personal" || (e.kind === "organization" && matchesForm(e, subjectValue, schoolYear))),
    )
    .map((e) => e.sourceRef);
}

/** Re-evaluates the school rows the teacher hasn't touched against a new subject/year; everything else stays. */
export function reconcileSchoolIds(
  current: string[],
  entries: SourceDefault[],
  subjectValue: string | undefined,
  schoolYear: number | undefined,
  touched: Set<string>,
): string[] {
  const next = current.filter((id) => !entries.some((e) => e.sourceRef === id && indexedSchool(e) && !touched.has(id)));
  for (const e of entries) {
    if (indexedSchool(e) && !touched.has(e.sourceRef) && e.effectiveDefault && matchesForm(e, subjectValue, schoolYear)) {
      next.push(e.sourceRef);
    }
  }
  return next;
}
