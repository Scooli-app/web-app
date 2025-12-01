import type {
  TeachingMethod,
  DocumentType,
  DocumentTemplate,
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
  schoolYear: number;
  lessonTime?: number;
  customTime?: number;
  teachingMethod?: TeachingMethod;
  additionalDetails?: string;
  templateId?: string;
  template?: DocumentTemplate;
}

export type FormUpdateFn = <K extends keyof FormState>(
  field: K,
  value: FormState[K]
) => void;
