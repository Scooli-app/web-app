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
  prompt?: string;
  duration?: number;
  schoolYear?: number;
  templateId?: string;
  documentType?: DocumentType;
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
  sources?: RagSource[];
  createdAt: string;
  updatedAt: string;
}

/**
 * RAG source representing a curriculum chunk used during AI generation.
 */
export interface RagSource {
  chunkId: string;
  documentName: string;
  topicKey: string;
  topicLeaf: string;
  chunkContent: string;
  similarity: number;
  url?: string;
}

