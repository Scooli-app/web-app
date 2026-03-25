/**
 * Document types and interfaces
 */

export type DocumentType =
  | "lessonPlan"
  | "quiz"
  | "presentation"
  | "test"
  | "worksheet";

// `assessment` remains only for compatibility with legacy worksheet documents.
export type WorksheetVariant =
  | "practice"
  | "diagnostic"
  | "formative"
  | "exploration"
  | "assessment";

export enum TeachingMethod {
  ACTIVE = "active",
  LECTURE = "lecture",
  PRACTICAL = "practical",
  SOCIAL_EMOTIONAL = "socialEmotional",
  INTERACTIVE = "interactive",
}

export interface DocumentMetadata {
  prompt?: string;
  duration?: number;
  schoolYear?: number;
  templateId?: string;
  documentType?: DocumentType;
  worksheetVariant?: WorksheetVariant;
  [key: string]: unknown;
}

export type SharedResourceStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface Document {
  id: string;
  title: string;
  documentType: DocumentType;
  content: string;
  status: string;
  metadata: DocumentMetadata;
  isPublic: boolean;
  subject: string | null;
  gradeLevel: string | null;
  rating: number;
  downloads: number;
  sharedResourceId?: string | null;
  sharedResourceStatus?: SharedResourceStatus | null;
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

export type DocumentImageKind = "illustration" | "exercise";
export type DocumentImageStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed";

export type DocumentImageSource =
  | "ai_generated"
  | "exercise_renderer"
  | "user_upload";

// Matches backend image list/SSE payload shape.
export interface DocumentImage {
  id: string;
  url?: string | null;
  alt: string;
  kind: DocumentImageKind;
  exerciseType?: string | null;
  source?: DocumentImageSource | null;
  status?: DocumentImageStatus;
  contentType?: string | null;
  placeholderToken?: string | null;
  errorMessage?: string | null;
}

// Matches backend regenerate endpoint payload.
export interface RegenerateDocumentImageResponse {
  id: string;
  newUrl: string | null;
  alt: string;
  status?: DocumentImageStatus;
  contentType?: string | null;
  source?: DocumentImageSource | null;
  placeholderToken?: string | null;
  errorMessage?: string | null;
}

export interface UploadDocumentImageResponse {
  image: DocumentImage;
  markdown: string;
}


