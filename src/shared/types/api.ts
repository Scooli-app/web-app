/**
 * API types - responses, requests, and service interfaces
 */

import type {
  Document,
  DocumentImage,
  DocumentType,
  RagSource,
  TeachingMethod,
  WorksheetVariant,
} from "./document";

// Generic API response types




export interface CreateDocumentParams {
  documentType: DocumentType;
  prompt: string;
  subject: string;
  schoolYear: number;
  duration?: number;
  teachingMethod?: TeachingMethod;
  additionalDetails?: string;
  templateId?: string;
  isSpecificComponent?: boolean;
  worksheetVariant?: WorksheetVariant;
  /** Explicit user/org source IDs to include in RAG retrieval. */
  sourceIds?: string[];
  /** Whether to include Aprendizagens Essenciais corpus (default true). */
  includeAe?: boolean;
}


export interface DocumentFilters {
  documentType?: string;
  search?: string;
}

export interface DocumentStatsResponse {
  totalCount: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface GetDocumentsParams {
  page?: number;
  limit?: number;
  filters?: DocumentFilters;
}

// Backend paginated response structure
export interface BackendPaginatedResponse {
  items: Document[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface GetDocumentsResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}








export interface ChatResponse {
  id: string;
  title: string;
  content: string;
  chatAnswer: string;
  sources?: RagSource[];
  updatedAt: string;
}



// SSE Streaming types for document creation
export interface CreateDocumentStreamResponse {
  streamUrl: string;
  id: string;
  status: "generating" | "completed" | "error";
  message: string;
}

export interface StreamEvent {
  type: "content" | "title" | "sources" | "done" | "error" | "status" | "visuals_generating" | "image_ready" | "image_failed" | "image_progress";
  data: string;
}

export interface StreamedResponse {
  id?: string;
  title?: string;
  content?: string;
  updatedAt?: string;
  chatAnswer?: string;
  sources?: RagSource[];
}

export interface DocumentStreamCallbacks {
  onContent?: (chunk: string) => void;
  onTitle?: (title: string) => void;
  onSources?: (sources: RagSource[]) => void;
  onStatus?: (status: string) => void;
  onVisualsGenerating?: (count?: number) => void;
  onImageReady?: (image: DocumentImage) => void;
  onImageFailed?: (image: DocumentImage | null, error?: string) => void;
  onComplete?: (documentId: string, response: StreamedResponse) => void;
  onError?: (error: string) => void;
}
