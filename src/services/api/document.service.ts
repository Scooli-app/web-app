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
} from "@/shared/types";
import apiClient from "./client";

export type {
  CreateDocumentParams,
  DocumentResponse,
  DocumentFilters,
  GetDocumentsParams,
  GetDocumentsResponse,
  DocumentCountsResponse,
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
    gradeLevel: backend.gradeLevel || undefined,
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

/**
 * Get document counts by type
 * Note: Backend doesn't show this endpoint in Swagger
 * This might need to be implemented on backend or calculated client-side
 */
export async function getDocumentCounts(): Promise<DocumentCountsResponse> {
  // For now, fetch all documents and count client-side
  // TODO: Backend should implement a counts endpoint
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
 * Backend expects: { documentType: string, prompt: string }
 */
export async function createDocument(
  documentType: string,
  prompt: string
): Promise<Document> {
  const request: CreateDocumentParams = {
    documentType,
    prompt,
  };

  const response = await apiClient.post<DocumentResponse>(
    "/documents",
    request
  );
  return mapBackendToDocument(response.data);
}

/**
 * Update an existing document
 * Note: Backend PUT returns 400 saying update is not supported
 * This endpoint may not work until backend implements proper update
 */
export async function updateDocument(
  id: string,
  documentType: string,
  prompt: string
): Promise<Document> {
  const request: CreateDocumentParams = {
    documentType,
    prompt,
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
