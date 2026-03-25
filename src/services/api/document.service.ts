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
  StreamedResponse,
  StreamEvent,
  WorksheetVariant,
} from "@/shared/types";
import type { DocumentImage } from "@/shared/types/document";
import axios, { type AxiosError } from "axios";
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
 * Connect to SSE stream and receive document content chunks.
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
        callbacks.onError?.(`Erro do cliente: ${response.status}`);
        throw new Error(`Erro do cliente: ${response.status}`);
      } else {
        callbacks.onError?.(`Erro do servidor: ${response.status}`);
        throw new Error(`Erro do servidor: ${response.status}`);
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
          case "visuals_generating":
            try {
              const payload = JSON.parse(parsed.data) as { count?: number };
              callbacks.onVisualsGenerating?.(payload.count);
            } catch {
              callbacks.onVisualsGenerating?.();
            }
            break;
          case "image_ready": {
            try {
              const image = JSON.parse(parsed.data) as DocumentImage;
              callbacks.onImageReady?.(image);
            } catch (e) {
              console.warn("[SSE] Could not parse image payload:", e);
            }
            break;
          }
          case "image_failed": {
            try {
              const payload = JSON.parse(parsed.data) as Partial<DocumentImage> & {
                error?: string;
                errorMessage?: string;
                message?: string;
              };
              const resolvedError =
                payload.error ||
                payload.errorMessage ||
                payload.message ||
                "Falha ao gerar imagem";
              if (payload && typeof payload.id === "string") {
                const imagePayload = {
                  ...payload,
                  errorMessage:
                    payload.errorMessage ?? payload.error ?? payload.message ?? null,
                } as DocumentImage;
                callbacks.onImageFailed?.(
                  imagePayload,
                  resolvedError
                );
              } else {
                callbacks.onImageFailed?.(null, resolvedError);
              }
            } catch {
              callbacks.onImageFailed?.(null, parsed.data);
            }
            break;
          }
          case "done": {
            let streamedResponse: StreamedResponse = { chatAnswer: "", content: "", sources };
            try {
              const donePayload = JSON.parse(parsed.data) as StreamedResponse & { generatedContent?: string };
              streamedResponse = {
                ...donePayload,
                content: donePayload.content ?? donePayload.generatedContent ?? "",
                sources: donePayload.sources ?? sources,
              };
            } catch {
              try {
                const fallbackPayload = JSON.parse(accumulatedContent) as StreamedResponse & { generatedContent?: string };
                streamedResponse = {
                  ...fallbackPayload,
                  content: fallbackPayload.content ?? fallbackPayload.generatedContent ?? "",
                  sources,
                };
              } catch {
                console.warn("[SSE] Could not parse final document payload");
              }
            }
            const documentId = streamedResponse.id ?? parsed.data;
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
      callbacks.onError?.("Erro de ligação ao stream");
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

/**
 * Get a Presigned PUT URL for uploading a document to R2
 */
export interface DocumentImportRequest {
  title: string;
  documentType: DocumentType;
  subject: string;
  schoolYear: number;
  fileKey: string;
  worksheetVariant?: WorksheetVariant;
}

export async function getUploadUrl(
  filename: string,
  contentType: string,
  documentType: string
): Promise<{ uploadUrl: string; fileKey: string }> {
  const params = new URLSearchParams();
  params.append("filename", filename);
  params.append("contentType", contentType);
  params.append("documentType", documentType);

  const response = await apiClient.get<{ uploadUrl: string; fileKey: string }>(
    `/documents/upload-url?${params.toString()}`
  );
  return response.data;
}

/**
 * Import a document from R2 and normalize it via AI
 */
export async function importDocument(
  data: DocumentImportRequest
): Promise<{ id: string; message: string }> {
  const response = await apiClient.post<{ id: string; message: string }>(
    "/documents/import",
    data
  );
  return response.data;
}

/**
 * Poll the backend until the document is available (status 200 OK)
 * Used to wait for background jobs (like import) to finish.
 */
export async function waitForDocument(id: string, maxAttempts = 60): Promise<void> {
  const delayMs = 3000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const doc = await getDocument(id);
      if (doc.status === "completed") {
        return; // Success!
      }
      if (doc.status === "error") {
        // The backend saves the specific error message into the 'content' field
        throw new Error(doc.content || "Erro ao processar o formato do ficheiro.");
      }
      // If status is still "processing", we just catch the timeout below
    } catch (e: unknown) {
      // If it's a custom error we threw above (like doc.status === "error"), throw it immediately to break the promise
      if (!axios.isAxiosError(e)) {
        throw e;
      }
      
      const axiosError = e as AxiosError;
      
      // If it's an Axios error that is NOT a 404, we might want to rethrow if it's a fatal 500
      if (axiosError.response?.status && axiosError.response.status >= 500) {
        throw new Error(`Erro de servidor ao importar o documento. (${axiosError.response.status})`);
      }
      
      // Otherwise (e.g., 404 or network hiccup), just wait and try again
    }
    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Tempo limite excedido a aguardar pela formatação do documento.");
}
