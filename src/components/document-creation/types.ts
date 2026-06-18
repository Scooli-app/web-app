import type {
    DocumentTemplate,
    DocumentType,
    TeachingMethod,
    WorksheetVariant,
} from "@/shared/types";

export interface DocumentTypeConfig {
  id: DocumentType;
  title: string;
  description: string;
  placeholder: string;
  redirectPath: string;
  generateTitlePrefix: string;
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
