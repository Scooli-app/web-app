import { SUBJECTS } from "@/components/document-creation/constants";
import {
  ACQUISITION_SOURCE_LABELS,
  ONBOARDING_GOAL_LABELS,
  SUBJECT_AREA_LABELS,
  TEACHING_LEVEL_LABELS,
  type AcquisitionSource,
  type OnboardingGoal,
  type SubjectArea,
  type TeachingLevel,
} from "@/shared/types/onboarding";

export function getAcquisitionLabel(key: string | null | undefined) {
  if (!key) return "—";
  return ACQUISITION_SOURCE_LABELS[key as AcquisitionSource] ?? key;
}

/** v1 answers are enum keys ("MATH"), v2 are catalogue ids ("matematica"); both show the PT name. */
export function getSubjectLabel(key: string) {
  return (
    SUBJECT_AREA_LABELS[key as SubjectArea] ??
    SUBJECTS.find((s) => s.id === key)?.label ??
    key
  );
}

export function getLevelLabel(key: string) {
  return TEACHING_LEVEL_LABELS[key as TeachingLevel] ?? key;
}

/** Cycle key (as in TEACHING_LEVEL_LABELS) of a v2 school year label like "5º ano". */
export function getYearCycle(yearLabel: string): string | null {
  const year = Number.parseInt(yearLabel, 10);
  if (Number.isNaN(year)) return null;
  if (year <= 4) return "1ST_CYCLE";
  if (year <= 6) return "2ND_CYCLE";
  if (year <= 9) return "3RD_CYCLE";
  return "SECONDARY";
}

/** Sums breakdown rows whose keys share a display label (e.g. v1 "MATH" and v2 "matematica"). */
export function mergeByLabel(
  items: { key: string; count: number }[],
  getLabel: (key: string) => string,
) {
  const merged = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(item.key);
    merged.set(label, (merged.get(label) ?? 0) + item.count);
  }
  return [...merged].map(([label, count]) => ({ key: label, label, count }));
}

export function getGoalLabel(key: string) {
  return ONBOARDING_GOAL_LABELS[key as OnboardingGoal] ?? key;
}

export const PREP_HOURS_LABELS: Record<string, string> = {
  LT2: "Menos de 2 h",
  H2_5: "2–5 h",
  H5_10: "5–10 h",
  GT10: "10+ h",
};

export const CURRENT_TOOLS_LABELS: Record<string, string> = {
  AI_CHAT: "ChatGPT",
  OTHER_AI: "Outra ferramenta de IA",
  WEB_SEARCH: "Procura na internet",
  PUBLISHER: "Manuais e recursos das editoras",
  COLLEAGUES: "Materiais de colegas",
  FROM_SCRATCH: "Faz tudo de raiz",
};

export const CLASS_COUNT_LABELS: Record<string, string> = {
  C1_2: "1–2 turmas",
  C3_4: "3–4 turmas",
  C5_PLUS: "5+ turmas",
};

export const TEACHER_ROLE_LABELS: Record<string, string> = {
  teacher: "Professor(a)",
  special_ed: "Educação Especial",
  vocational: "Ensino Profissional",
  preschool: "Educação pré-escolar",
  coordinator: "Coordenador(a)",
  director: "Direção",
  tutor: "Explicador(a)",
  other: "Outro",
};

export const PLANNING_DAY_LABELS: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
  7: "Domingo",
};

export function parseCommaSeparated(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
