/**
 * Document Service
 * Functions for document-related API calls
 * Based on Chalkboard backend API (Quarkus)
 */

import type {
    BackendPaginatedResponse,
    ChatResponse,
    CreateDocumentParams,
    CreateDocumentStreamResponse,
    Document,
    DocumentCountsResponse,
    DocumentFilters,
    DocumentResponse,
    DocumentStatsResponse,
    DocumentStreamCallbacks,
    DocumentType,
    GetDocumentsParams,
    GetDocumentsResponse,
    StreamEvent,
} from "@/shared/types";
import apiClient from "./client";

export type {
    ChatResponse, CreateDocumentParams, CreateDocumentStreamResponse, DocumentCountsResponse, DocumentFilters, DocumentResponse, DocumentStreamCallbacks, DocumentType, GetDocumentsParams,
    GetDocumentsResponse, StreamEvent
};

/**
 * Get list of documents
 * Backend returns paginated response with items, page, size, totalItems, etc.
 */
export async function getDocuments(
  params: GetDocumentsParams
): Promise<GetDocumentsResponse> {
  const { page = 1, limit = 10, filters } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page - 1)); // Backend uses 0-based pages
  queryParams.set("size", String(limit));
  if (filters?.documentType && filters.documentType !== "all") {
    queryParams.set("documentType", filters.documentType);
  }
  if (filters?.search) {
    queryParams.set("search", filters.search);
  }

  const response = await apiClient.get<BackendPaginatedResponse>(
    `/documents?${queryParams.toString()}`
  );

  const data = response.data;
  const documents = data?.items ?? [];

  return {
    documents,
    pagination: {
      page: (data?.page ?? 0) + 1, // Convert back to 1-based
      limit: data?.size ?? limit,
      total: data?.totalItems ?? 0,
      hasMore: data?.hasNext ?? false,
    },
  };
}

/**
 * Get document statistics (counts by type and status)
 */
export async function getDocumentStats(): Promise<DocumentStatsResponse> {
  const response = await apiClient.get<DocumentStatsResponse>(
    "/documents/stats"
  );
  return response.data;
}

/**
 * @deprecated Use getDocumentStats() instead
 */
export async function getDocumentCounts(): Promise<DocumentCountsResponse> {
  return getDocumentStats();
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string): Promise<Document> {
  const response = await apiClient.get<Document>(`/documents/${id}`);
  return response.data;
}

/**
 * Create a new document with SSE streaming
 * Returns initial response with streamUrl for content streaming
 */
export async function createDocument(
  params: CreateDocumentParams
): Promise<CreateDocumentStreamResponse> {
  const response = await apiClient.post<CreateDocumentStreamResponse>(
    "/documents",
    params
  );
  return response.data;
}

/**
 * Connect to SSE stream and receive document content chunks
 * Backend streams a JSON object: {"chatAnswer": "...", "generatedContent": "..."}
 */
export async function streamDocumentContent(
  streamUrl: string,
  callbacks: DocumentStreamCallbacks,
  authToken: string
): Promise<() => void> {
  const { fetchEventSource } = await import("@microsoft/fetch-event-source");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL || "";
  const fullUrl = `${baseUrl}${
    streamUrl.startsWith("/") ? "" : "/"
  }${streamUrl}`;

  let accumulatedContent = "";
  let sources: import("@/shared/types/document").RagSource[] = [];
  const abortController = new AbortController();

  fetchEventSource(fullUrl, {
    signal: abortController.signal,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    async onopen(response) {
      if (response.ok) {
        return;
      }
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        callbacks.onError?.(`Client error: ${response.status}`);
        throw new Error(`Client error: ${response.status}`);
      } else {
        callbacks.onError?.(`Server error: ${response.status}`);
        throw new Error(`Server error: ${response.status}`);
      }
    },
    onmessage(event) {
      try {
        const parsed: StreamEvent = JSON.parse(event.data);

        switch (parsed.type) {
          case "content":
            accumulatedContent += parsed.data;
            callbacks.onContent?.(parsed.data);
            break;
          case "title":
            callbacks.onTitle?.(parsed.data);
            break;
          case "sources": {
            try {
              sources = JSON.parse(parsed.data);
              callbacks.onSources?.(sources);
            } catch (e) {
              console.warn("[SSE] Could not parse sources:", e);
            }
            break;
          }
          case "done": {
            // Parse the accumulated JSON response
            let streamedResponse = { chatAnswer: "", generatedContent: "", sources };
            try {
              const parsed = JSON.parse(accumulatedContent);
              streamedResponse = { ...parsed, sources };
            } catch {
              console.warn("[SSE] Could not parse accumulated content as JSON");
            }
            // done data contains the document ID
            const documentId = parsed.data;
            callbacks.onComplete?.(documentId, streamedResponse);
            abortController.abort();
            break;
          }
          case "error":
            callbacks.onError?.(parsed.data);
            abortController.abort();
            break;
        }
      } catch (e) {
        console.error("[SSE] Parse error:", e, "Raw data:", event.data);
      }
    },
    onerror(error) {
      console.error("[SSE] Error:", error);
      callbacks.onError?.("Stream connection error");
      throw error;
    },
  });

  return () => {
    abortController.abort();
  };
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: string }
): Promise<Document> {
  const response = await apiClient.put<Document>(`/documents/${id}`, data);
  return response.data;
}

/**
 * Send a chat message to update a document via AI
 * Returns updated document with chatAnswer
 */
export async function chatWithDocument(
  id: string,
  message: string
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>(`/documents/${id}/chat`, {
    chatMessage: message,
  });
  return response.data;
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
