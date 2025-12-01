/**
 * Document Service
 * Functions for document-related API calls
 * Based on Chalkboard backend API (Quarkus)
 */

import type {
  Document,
  CreateDocumentParams,
  DocumentResponse,
  DocumentFilters,
  GetDocumentsParams,
  GetDocumentsResponse,
  DocumentCountsResponse,
  DocumentType,
  UpdateDocumentRequest,
} from "@/shared/types";
import apiClient from "./client";

export type {
  CreateDocumentParams,
  DocumentResponse,
  DocumentFilters,
  GetDocumentsParams,
  GetDocumentsResponse,
  DocumentCountsResponse,
  DocumentType,
};

/**
 * Convert backend response to frontend Document (both use camelCase)
 */
function mapBackendToDocument(backend: DocumentResponse): Document {
  return {
    id: backend.id,
    userId: "", // Not in backend response, will need to be handled separately
    title: backend.title,
    content: backend.content,
    documentType: backend.documentType as Document["documentType"],
    metadata: backend.metadata || {},
    isPublic: backend.isPublic,
    downloads: backend.downloads,
    rating: backend.rating,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
    subject: backend.subject || undefined,
    schoolYear: backend.schoolYear || undefined,
    duration: backend.duration || undefined,
  };
}

/**
 * Get list of documents
 * Note: Backend API returns array directly, pagination may not be supported
 * If backend supports query params, they can be added here
 */
export async function getDocuments(
  params: GetDocumentsParams
): Promise<GetDocumentsResponse> {
  const { page = 1, limit = 10, filters } = params;

  const response = await apiClient.get<DocumentResponse[]>("/documents");

  // Map backend responses to frontend format
  const allDocuments = response.data.map(mapBackendToDocument);

  // Calculate counts from all documents (before filtering)
  const counts: Record<string, number> = {};
  allDocuments.forEach((doc) => {
    counts[doc.documentType] = (counts[doc.documentType] || 0) + 1;
  });

  // Apply client-side filtering
  const filteredDocuments =
    filters?.type && filters.type !== "all"
      ? allDocuments.filter((doc) => doc.documentType === filters.type)
      : allDocuments;

  // Client-side pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  return {
    documents: paginatedDocuments,
    pagination: {
      page,
      limit,
      total: filteredDocuments.length,
      hasMore: endIndex < filteredDocuments.length,
    },
    counts,
  };
}

export async function getDocumentCounts(): Promise<DocumentCountsResponse> {
  const response = await apiClient.get<DocumentResponse[]>("/documents");
  const documents = response.data.map(mapBackendToDocument);

  const counts: Record<string, number> = {};
  documents.forEach((doc) => {
    counts[doc.documentType] = (counts[doc.documentType] || 0) + 1;
  });

  return { counts };
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string): Promise<Document> {
  const response = await apiClient.get<DocumentResponse>(`/documents/${id}`);
  return mapBackendToDocument(response.data);
}

/**
 * Create a new document
 */
export async function createDocument(
  params: CreateDocumentParams
): Promise<Document> {
  const response = await apiClient.post<DocumentResponse>("/documents", params);
  return mapBackendToDocument(response.data);
}

export async function updateDocument(
  id: string,
  prompt: string,
  title?: string,
  content?: string
): Promise<Document> {
  const request: UpdateDocumentRequest = {
    id,
    prompt,
    title,
    content,
  };

  const response = await apiClient.put<DocumentResponse>(
    `/documents/${id}`,
    request
  );
  return mapBackendToDocument(response.data);
}

/**
 * Delete a single document
 * Note: Backend DELETE doesn't show query params in Swagger
 */
export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

/**
 * Delete multiple documents
 * Note: Backend doesn't show batch delete endpoint in Swagger
 * This needs to be implemented on backend or delete one by one
 */
export async function deleteDocuments(
  ids: string[]
): Promise<{ deletedCount: number }> {
  // Delete one by one until backend implements batch delete
  let deletedCount = 0;
  for (const id of ids) {
    try {
      await deleteDocument(id);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
    }
  }
  return { deletedCount };
}
