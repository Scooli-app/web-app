/**
 * Document types and interfaces
 */

export type DocumentType =
  | "lessonPlan"
  | "quiz"
  | "presentation"
  | "test"
  | "worksheet"
  | "curriculumPlan";

/**
 * Macro curriculum-plan planning period. Drives prompt depth on the backend
 * (annual = high level, trimester = fine grain).
 */
export type CurriculumPlanningType =
  | "annual"
  | "semester"
  | "trimester"
  | "custom";

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
  isSpecificComponent?: boolean;
  worksheetVariant?: WorksheetVariant;
  sources?: RagSource[];
  [key: string]: unknown;
}

export type SharedResourceStatus = "PENDING" | "APPROVED" | "REJECTED"

/**
 * Library scope the document has been shared in. Mirrors
 * `LibraryScope` from the community service but kept local here so
 * `@/shared/types` does not depend on `@/services`.
 */
export type DocumentSharedScope = "community" | "organization";

export interface DocumentClassInfo {
  timetableId: string;
  title: string;
  classLabel: string;
  color: string;
  subject: string | null;
  gradeLevel: number | null;
  /** The lesson in that turma (its most recent one), when the document belongs to a lesson. */
  lessonId?: string | null;
  lessonNumber?: number | null;
  /** YYYY-MM-DD */
  lessonDate?: string | null;
}

export interface Document {
  id: string;
  title: string;
  documentType: DocumentType;
  /**
   * Storage format of {@link #content}:
   *   - {@code "markdown"} (default for all legacy doc types)
   *   - {@code "json"} (Presentations pilot — content is a serialized
   *     {@link import("./blocks").PresentationDocument})
   *
   * Renderers branch on this; if absent assume "markdown" (older docs).
   */
  contentFormat?: "markdown" | "json";
  content: string;
  status: string;
  metadata: DocumentMetadata | null;
  /** The turma (timetable) this document was generated for; absent when it belongs to none. */
  classInfo?: DocumentClassInfo | null;
  isPublic: boolean;
  subject: string | null;
  gradeLevel: string | null;
  /** Non-null for imported documents (e.g. "docx", "pdf"). Null for AI-generated. */
  originalFormat?: string | null;
  isSpecificComponent: boolean;
  /** Curso profissional the document was generated for, with a UC or a school-component subject. */
  vocationalCourseCode?: string | null;
  vocationalUnitCode?: string | null;
  vocationalSchoolSubjectName?: string | null;
  rating: number;
  downloads: number;
  sharedResourceId?: string | null;
  sharedResourceStatus?: SharedResourceStatus | null;
  /**
   * All library scopes the document is currently shared in. Empty array if
   * the document has not been shared. Populated by the backend when reading
   * a document; not persisted on the client.
   */
  sharedScopes?: DocumentSharedScope[];
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

/** What a stock image shows. */
export type StockImageType = "photo" | "illustration" | "diagram" | "map";

/** The picker's filter chips; "diagram" covers diagrams and maps. Omitted = all. */
export type StockImageFilter = "photo" | "illustration" | "diagram";

/**
 * A stock image search hit (Wikimedia Commons, Openverse, Pixabay or Pexels). Thumbnails are
 * hotlinked only for the picker grid; importing copies the image into our storage.
 */
export interface StockImage {
  /** Opaque "provider:id", sent back on import. */
  id: string;
  provider: string;
  providerName: string;
  type: StockImageType;
  thumbnailUrl: string;
  width: number;
  height: number;
  alt?: string | null;
  author?: string | null;
  authorUrl?: string | null;
  /** The image's page on the provider's site. */
  sourceUrl?: string | null;
  /** Short licence label: "CC BY-SA 4.0", "CC0", "Public domain", "Pexels License"... */
  license: string;
  licenseCode: string;
  licenseUrl?: string | null;
  /** CC BY / CC BY-SA: the credit must name the author and the licence. */
  attributionRequired: boolean;
  avgColor?: string | null;
}

export interface StockImageSearchResponse {
  results: StockImage[];
  page: number;
  hasMore: boolean;
  /** Providers that answered, in merge order. */
  providers: string[];
  /** Providers that failed or were rate limited: results are partial. */
  failedProviders: string[];
}

export interface ImportStockImageResponse {
  image: DocumentImage;
  markdown: string;
  attribution: StockImage;
}

/**
 * Document statuses that mean generation/import will not complete. The backend's
 * terminal failure status is "failed"; "error" is still produced by some
 * import/stream paths (AGENTS.md Known Caveat #1). Both must render the same UI.
 */
export const FAILED_DOCUMENT_STATUSES: readonly string[] = ["failed", "error"];

export function isFailedDocumentStatus(status: string | null | undefined): boolean {
  return !!status && FAILED_DOCUMENT_STATUSES.includes(status);
}


