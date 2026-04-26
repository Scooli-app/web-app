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
}

export type FormUpdateFn = <K extends keyof FormState>(
  field: K,
  value: FormState[K]
) => void;
