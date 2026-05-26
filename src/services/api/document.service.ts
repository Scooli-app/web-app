/**
 * Document Service
 * Functions for document-related API calls
 * Based on Chalkboard backend API (Quarkus)
 */

import type { BackendPaginatedResponse, ChatResponse, CreateDocumentParams, CreateDocumentStreamResponse, Document, DocumentFilters, DocumentStatsResponse, DocumentStreamCallbacks, DocumentType, GetDocumentsParams, GetDocumentsResponse, StreamedResponse, StreamEvent, WorksheetVariant } from "@/shared/types";
import type { DocumentImage, RagSource } from "@/shared/types/document";
import axios, { type AxiosError } from "axios";
import apiClient from "./client";

export type { DocumentFilters };

function isRagSourceArray(value: unknown): value is RagSource[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as RagSource).chunkId === "string" &&
        typeof (item as RagSource).documentName === "string"
    )
  );
}

function normalizeDocument(document: Document): Document {
  const metadataSources = document.metadata?.sources;
  const sources = isRagSourceArray(document.sources)
    ? document.sources
    : isRagSourceArray(metadataSources)
      ? metadataSources
      : [];

  return {
    ...document,
    sources,
  };
}

export async function getDocuments(
  params: GetDocumentsParams
): Promise<GetDocumentsResponse> {
  const { page = 1, limit = 10, filters } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page - 1));
  queryParams.set("size", String(limit));
  if (filters?.documentType && filters.documentType !== "all") {
    queryParams.set("documentType", filters.documentType);
  }
  if (filters?.search) {
    queryParams.set("search", filters.search);
  }
  if (filters?.subject) {
    queryParams.set("subject", filters.subject);
  }
  if (filters?.gradeLevel) {
    queryParams.set("gradeLevel", filters.gradeLevel);
  }

  const response = await apiClient.get<BackendPaginatedResponse>(
    `/documents?${queryParams.toString()}`
  );

  const data = response.data;
  const documents = (data?.items ?? []).map(normalizeDocument);

  return {
    documents,
    pagination: {
      page: (data?.page ?? 0) + 1,
      limit: data?.size ?? limit,
      total: data?.totalItems ?? 0,
      hasMore: data?.hasNext ?? false,
    },
  };
}

export async function getDocumentStats(): Promise<DocumentStatsResponse> {
  const response = await apiClient.get<DocumentStatsResponse>(
    "/documents/stats"
  );
  return response.data;
}

export async function getDocument(id: string): Promise<Document> {
  const response = await apiClient.get<Document>(`/documents/${id}`);
  return normalizeDocument(response.data);
}

export async function createDocument(
  params: CreateDocumentParams
): Promise<CreateDocumentStreamResponse> {
  const requestBody = {
    ...params,
    isSpecificComponent: params.isSpecificComponent ?? false,
  };

  const response = await apiClient.post<CreateDocumentStreamResponse>(
    "/documents",
    requestBody
  );
  return response.data;
}

export async function streamDocumentContent(
  streamUrl: string,
  callbacks: DocumentStreamCallbacks,
  getToken: () => Promise<string | null>
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
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Erro de autenticação: token não disponível");
      }
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return window.fetch(input, { ...init, headers });
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
          case "status":
            callbacks.onStatus?.(parsed.data);
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
            abortController.abort();
            const documentId = streamedResponse.id ?? parsed.data;
            callbacks.onComplete?.(documentId, streamedResponse);
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
      if (abortController.signal.aborted) {
        throw error;
      }
      console.warn("[SSE] Transient error, will retry:", error);
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

export async function chatWithDocument(
  id: string,
  message: string
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>(`/documents/${id}/chat`, {
    chatMessage: message,
  });
  return response.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

export async function deleteDocuments(
  ids: string[]
): Promise<{ deletedCount: number }> {
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

interface DocumentImportRequest {
  title: string;
  documentType: DocumentType;
  subject: string;
  schoolYear: number;
  fileKey: string;
  isSpecificComponent?: boolean;
  worksheetVariant?: WorksheetVariant;
  usageIntent?: "reference" | "standing_context";
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

export async function importDocument(
  data: DocumentImportRequest
): Promise<{ id: string; message: string }> {
  const response = await apiClient.post<{ id: string; message: string }>(
    "/documents/import",
    data
  );
  return response.data;
}

export async function waitForDocument(id: string, maxAttempts = 60): Promise<void> {
  const delayMs = 3000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const doc = await getDocument(id);
      if (doc.status === "completed") {
        return;
      }
      if (doc.status === "error") {
        throw new Error(doc.content || "Erro ao processar o formato do ficheiro.");
      }
    } catch (e: unknown) {
      if (!axios.isAxiosError(e)) {
        throw e;
      }
      
      const axiosError = e as AxiosError;
      
      if (axiosError.response?.status && axiosError.response.status >= 500) {
        throw new Error(`Erro de servidor ao importar o documento. (${axiosError.response.status})`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Tempo limite excedido a aguardar pela formatação do documento.");
}
