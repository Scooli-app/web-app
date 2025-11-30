/**
 * API types - responses, requests, and service interfaces
 */

import type { Document, DocumentType } from "./document";

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
  gradeLevel: string;
  lessonTime?: string;
  teachingMethod?: string;
  additionalDetails?: string;
}

export interface DocumentResponse {
  id: string;
  title: string;
  documentType: DocumentType;
  content: string;
  metadata: Record<string, unknown>;
  isPublic: boolean;
  subject: string | null;
  gradeLevel: string | null;
  rating: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilters {
  type?: string;
  search?: string;
  subject?: string;
  gradeLevel?: string;
}

export interface GetDocumentsParams {
  page?: number;
  limit?: number;
  userId: string;
  filters?: DocumentFilters;
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
  grade_level?: string;
  is_public?: boolean;
}

export interface UpdateDocumentRequest {
  id: string;
  prompt: string;
  title?: string;
  content?: string;
}

export interface DeleteDocumentRequest {
  ids: string[];
}
