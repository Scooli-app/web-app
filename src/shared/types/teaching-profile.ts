/**
 * Teaching profile — the teacher's curriculum context.
 *
 * Distinct from `onboarding.ts`: the onboarding survey is analytics, skippable
 * and answered once. This is functional configuration, editable from Settings,
 * and it determines the curriculum used for every generation.
 */

export type EducationType = "regular" | "vocational";

/**
 * `subject` in the sociocultural and scientific components, where the National
 * Qualifications Catalogue publishes subjects with their own codes.
 * `unit` in the technological component, where the catalogue publishes only
 * competence units — the subject there is a school's own grouping and exists
 * in no national source.
 */
export type TeachingItemKind = "subject" | "unit";

export type TrainingComponent =
  | "sociocultural"
  | "scientific"
  | "technological";

export type IngestionStatus = "pending" | "running" | "indexed" | "failed";

export const TRAINING_COMPONENT_LABELS: Record<TrainingComponent, string> = {
  sociocultural: "Sociocultural",
  scientific: "Científica",
  technological: "Tecnológica",
};

export const INGESTION_STATUS_LABELS: Record<IngestionStatus, string> = {
  pending: "Em fila",
  running: "A preparar",
  indexed: "Pronto",
  failed: "Falhou",
};

export interface Qualification {
  code: string;
  versionId: number | null;
  title: string;
  level: number | null;
  cnaefCode: string | null;
  cnaefLabel: string | null;
  /** `RA` = new referential with competence units; `PP` = older, with UFCD. */
  referentialFormat: string | null;
}

export interface VocationalUnit {
  code: string;
  title: string;
  position: number | null;
}

export interface TeachingCourseState {
  code: string;
  title: string;
  ingestionStatus: IngestionStatus;
}

export interface TeachingItem {
  qualificationCode: string;
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
