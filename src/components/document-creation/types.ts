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
