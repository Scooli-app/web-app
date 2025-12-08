/**
 * API types - responses, requests, and service interfaces
 */

import type { Document, DocumentType, TeachingMethod } from "./document";

// Generic API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateDocumentParams {
  documentType: DocumentType;
  prompt: string;
  subject: string;
  schoolYear: number;
  duration?: number;
  teachingMethod?: TeachingMethod;
  additionalDetails?: string;
  templateId?: string;
}

// DocumentResponse matches Document type exactly (backend response)
export type DocumentResponse = Document;

export interface DocumentFilters {
  type?: string;
  search?: string;
  subject?: string;
  schoolYear?: number;
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
  counts: Record<string, number>;
}

export interface DocumentCountsResponse {
  counts: Record<string, number>;
}

export interface CreateDocumentRequest {
  title: string;
  content?: string;
  document_type: DocumentType;
  metadata?: Record<string, unknown>;
  subject?: string;
  schoolYear?: number;
  duration?: string;
  teachingMethod?: TeachingMethod;
  additionalDetails?: string;
  is_public?: boolean;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
}

export interface ChatRequest {
  chatMessage: string;
}

export interface ChatResponse {
  id: string;
  title: string;
  content: string;
  chatAnswer: string;
  updatedAt: string;
}

export interface DeleteDocumentRequest {
  ids: string[];
}

// SSE Streaming types for document creation
export interface CreateDocumentStreamResponse {
  streamUrl: string;
  id: string;
  status: "generating" | "completed" | "error";
  message: string;
}

export interface StreamEvent {
  type: "content" | "title" | "done" | "error";
  data: string;
}

export interface StreamedResponse {
  chatAnswer?: string;
  generatedContent?: string;
}

export interface DocumentStreamCallbacks {
  onContent?: (chunk: string) => void;
  onTitle?: (title: string) => void;
  onComplete?: (documentId: string, response: StreamedResponse) => void;
  onError?: (error: string) => void;
}
