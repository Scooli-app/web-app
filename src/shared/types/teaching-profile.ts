/**
 * Perfil de ensino — o contexto curricular do professor.
 *
 * Distinto de `onboarding.ts`: o inquérito de onboarding é analytics, saltável
 * e respondido uma vez. Isto é configuração funcional, editável nas Definições,
 * e determina o currículo usado nas gerações.
 */

export type EducationType = "regular" | "profissional";

/**
 * `subject` nas componentes sociocultural e científica, onde o Catálogo
 * Nacional de Qualificações publica disciplinas com código próprio.
 * `unit` na componente tecnológica, onde o catálogo publica apenas unidades de
 * competência — a disciplina é uma construção da escola e não existe em fonte
 * nacional.
 */
export type TeachingItemKind = "subject" | "unit";

export type TrainingComponent =
  | "sociocultural"
  | "cientifica"
  | "tecnologica";

export type IngestionStatus = "pending" | "running" | "indexed" | "failed";

export const TRAINING_COMPONENT_LABELS: Record<TrainingComponent, string> = {
  sociocultural: "Sociocultural",
  cientifica: "Científica",
  tecnologica: "Tecnológica",
};

export const INGESTION_STATUS_LABELS: Record<IngestionStatus, string> = {
  pending: "Em fila",
  running: "A preparar",
  indexed: "Pronto",
  failed: "Falhou",
};

export interface Qualification {
  codigo: string;
  qualVersaoId: number | null;
  designacao: string;
  nivel: number | null;
  cnaefCode: string | null;
  cnaefLabel: string | null;
  /** `RA` = referencial novo com unidades de competência; `PP` = antigo, com UFCD. */
  conceito: string | null;
}

export interface VocationalUnit {
  codigo: string;
  designacao: string;
  ordem: number | null;
}

export interface TeachingCourseState {
  codigo: string;
  designacao: string;
  ingestionStatus: IngestionStatus;
}

export interface TeachingItem {
  qualificationCodigo: string;
  kind: TeachingItemKind;
  code: string;
  label: string;
  trainingComponent: TrainingComponent | null;
}

export interface TeachingProfile {
  educationType: EducationType;
  courses: string[];
  courseStates: TeachingCourseState[];
  items: TeachingItem[];
}

export const EMPTY_TEACHING_PROFILE: TeachingProfile = {
  educationType: "regular",
  courses: [],
  courseStates: [],
  items: [],
};
