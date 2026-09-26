import type {
    DocumentTemplate,
    DocumentType,
    TeachingMethod,
    WorksheetVariant,
} from "@/shared/types";

// title/description/placeholder come from the `documentCreation.types.<id>` and
// `enums.documentType.<id>` catalogue keys (see FormHeader.tsx, FormActions.tsx,
// DocumentCreationPage.tsx) — not stored here, so they aren't duplicated and frozen
// at module load.
export interface DocumentTypeConfig {
  id: DocumentType;
  redirectPath: string;
}

export interface FormState {
  topic: string;
  subject: string;
  isSpecificComponent?: boolean;
  /**
   * "vocational" when the subject was picked from the teacher's saved
   * Ensino Profissional course/UC selections instead of the regular
   * subject catalogue. Only reachable when `teacher_profile` is enabled
   * and the teacher has saved vocational units. Purely a UI concern —
   * `subject` still carries the plain text sent to the backend.
   */
  subjectMode?: "regular" | "vocational";
  /** Selected course code while in vocational subject mode (UI only). */
  vocationalCourseCode?: string;
  /**
   * Code of the selected competence unit (UC) while in vocational subject
   * mode. Sent alongside `vocationalCourseCode` on document creation so the
   * backend can deterministically look up the UC's real curriculum content
   * instead of relying on `subject` (which carries the UC's display label
   * and never matches how vocational content is ingested/keyed server-side).
   */
  vocationalUnitCode?: string;
  /**
   * Display name of the selected sociocultural/científica component subject
   * (e.g. "Economia", "Psicologia e Sociologia") while in vocational subject
   * mode. Mutually exclusive with `vocationalUnitCode` — the backend
   * document-create contract accepts either a UC code or a school-subject
   * name, never both, since they identify content from different curriculum
   * components.
   */
  vocationalSchoolSubjectName?: string;
  schoolYear: number;
  lessonTime?: number;
  customTime?: number;
  teachingMethod?: TeachingMethod;
  additionalDetails?: string;
  templateId?: string;
  template?: DocumentTemplate;
  worksheetVariant?: WorksheetVariant;
  /** Source IDs selected for RAG context (user/org sources). */
  sourceIds?: string[];
  /** Whether to include Aprendizagens Essenciais corpus. Default true. */
  includeAe?: boolean;
  /** Selected regulatory (scope='scooli') source IDs to inject as standing context. */
  regulatorySourceIds?: string[];
  /**
   * Number of slides to generate (Presentations only). Range 5–20, default 10.
   * Persisted into `metadata.slideCount` and read by the backend prompt.
   */
  slideCount?: number;
  /** Theme ID to pre-apply when the presentation editor first loads (Presentations only). */
  themeId?: string;
}

export type FormUpdateFn = <K extends keyof FormState>(
  field: K,
  value: FormState[K]
) => void;
