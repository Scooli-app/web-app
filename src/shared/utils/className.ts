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
 * A turma's name as the calendar shows it ("2.º Matemática · A", or "Matemática · 2.º A"), so a
 * turma reads the same in the calendar, the documents filter and on cards.
 */
/** Same words in another order ("6.º Português · C" and "6.º C Português"): showing both reads as a repeat. */
export function sameClassWords(a: string, b: string): boolean {
  const words = (s: string) =>
    s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").sort().join(" ");
  return words(a) === words(b);
}

export function formatClassName(parts: ClassNameParts, labels: ClassNameLabels): string {
  const grade = parts.gradeLevel ? labels.gradeShort(parts.gradeLevel) : null;
  // A class label that already says the year ("7.º B") is not prefixed with it again ("7.º Matemática · 7.º B").
  const labelHasGrade = !!grade && !!parts.classLabel && parts.classLabel.replace(/\s/g, "").startsWith(grade.replace(/\s/g, ""));
  const base = parts.subject
    ? [labelHasGrade ? null : grade, labels.subject(parts.subject)].filter(Boolean).join(" ")
    : (parts.title ?? "");
  return parts.classLabel ? `${base} · ${parts.classLabel}` : base;
}
