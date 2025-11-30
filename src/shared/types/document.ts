/**
 * Document types and interfaces
 */

export type DocumentType = "lessonPlan" | "quiz" | "presentation" | "assay";

export interface DocumentMetadata {
  initialPrompt?: string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  documentType: DocumentType;
  metadata: DocumentMetadata;
  userId: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  rating?: number;
  isPublic: boolean;
  subject?: string;
  gradeLevel?: string;
}
