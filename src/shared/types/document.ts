/**
 * Document types and interfaces
 */

export type DocumentType = "lessonPlan" | "quiz" | "presentation" | "test";

export enum TeachingMethod {
  ACTIVE = "active",
  LECTURE = "lecture",
  PRACTICAL = "practical",
  SOCIAL_EMOTIONAL = "social_emotional",
  INTERACTIVE = "interactive",
}

export interface DocumentMetadata {
  initialPrompt?: string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  title: string;
  documentType: DocumentType;
  content: string;
  metadata: DocumentMetadata;
  isPublic: boolean;
  subject: string | null;
  gradeLevel: string | null;
  rating: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}
