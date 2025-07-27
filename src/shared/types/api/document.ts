import type { DocumentType } from "../domain/document";

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

export interface CreateDocumentRequest {
  title: string;
  content?: string;
  document_type: DocumentType;
  metadata?: Record<string, unknown>;
  subject?: string;
  grade_level?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface UpdateDocumentRequest {
  id: string;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  subject?: string;
  grade_level?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface DeleteDocumentRequest {
  id: string;
}
