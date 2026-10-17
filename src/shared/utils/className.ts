export interface ClassNameParts {
  gradeLevel?: number | null;
  subject?: string | null;
  classLabel?: string | null;
  title?: string | null;
}

export interface ClassNameLabels {
  /** e.g. 2 → "2.º" */
  gradeShort: (grade: number) => string;
  /** Stored subject value → display label. */
  subject: (value: string) => string;
}

/**
 * A turma's name as the calendar shows it ("2.º Matemática · 2.º A"), so a
 * turma reads the same in the calendar, the documents filter and on cards.
 */
export function formatClassName(parts: ClassNameParts, labels: ClassNameLabels): string {
  const base = parts.subject
    ? [parts.gradeLevel ? labels.gradeShort(parts.gradeLevel) : null, labels.subject(parts.subject)]
        .filter(Boolean)
        .join(" ")
    : (parts.title ?? "");
  return parts.classLabel ? `${base} · ${parts.classLabel}` : base;
}
