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

export function getSubjectLabel(key: string) {
  return SUBJECT_AREA_LABELS[key as SubjectArea] ?? key;
}

export function getLevelLabel(key: string) {
  return TEACHING_LEVEL_LABELS[key as TeachingLevel] ?? key;
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
