/**
 * Document Service
 * Functions for document-related API calls
 * Based on Chalkboard backend API (Quarkus)
 */

import type { BackendPaginatedResponse, ChatHistoryMessage, ChatResponse, CreateDocumentParams, CreateDocumentStreamResponse, Document, DocumentFilters, DocumentStatsResponse, DocumentStreamCallbacks, DocumentType, GenerateSlideResponse, GetDocumentsParams, GetDocumentsResponse, StreamedResponse, StreamEvent, WorksheetVariant } from "@/shared/types";
import { isFailedDocumentStatus, type DocumentImage, type RagSource } from "@/shared/types/document";
import type { DocumentVersionDetail, DocumentVersionSummary } from "@/shared/types/document-versions";
import { translate } from "@/i18n/translate";
import axios, { type AxiosError } from "axios";
import apiClient, { ApiRequestError, getApiToken, handleAccountLocked } from "./client";

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
  if (filters?.subject) {
    queryParams.set("subject", filters.subject);
  }
  if (filters?.gradeLevel) {
    queryParams.set("gradeLevel", filters.gradeLevel);
  }
  if (filters?.timetableId) {
    queryParams.set("timetableId", filters.timetableId);
  }

  const response = await apiClient.get<BackendPaginatedResponse>(
    `/documents?${queryParams.toString()}`
  );

  const data = response.data;
  const documents = (data?.items ?? []).map(normalizeDocument);

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
 * Get a single document by ID
 */
export async function getDocument(id: string): Promise<Document> {
  const response = await apiClient.get<Document>(`/documents/${id}`);
  return normalizeDocument(response.data);
}

/**
 * Create a new document with SSE streaming
 * Returns initial response with streamUrl for content streaming
 */
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

/**
 * Connect to SSE stream and receive document content chunks.
 *
 * Accepts a {@code getToken} callback rather than a static token so that every
 * connection attempt (including automatic reconnects after network blips) uses
 * a freshly-issued JWT.  The caller is responsible for providing a function
 * that returns a valid token or null.
 */
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
    // Resolve a fresh JWT on every connection attempt (initial + reconnects).
    // This prevents 401s when the SSE stream is reconnected after a network
    // blip and the original short-lived Clerk token has already expired.
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getToken();
      if (!token) {
        throw new Error(translate("errors.generation.authTokenMissing"));
      }
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return window.fetch(input, { ...init, headers });
    },
    async onopen(response) {
      if (response.ok) {
        return;
      }
      if (response.status === 403) {
        const body = await response.json().catch(() => null);
        if ((body as { code?: unknown } | null)?.code === "account_locked") {
          // Read-only account: the paywall opens; the editor shows the lock, not an HTTP error.
          const locked = handleAccountLocked(body);
          callbacks.onError?.(locked.message);
          abortController.abort();
          throw locked;
        }
      }
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        const message = translate("errors.generation.clientError", { status: response.status });
        callbacks.onError?.(message);
        throw new Error(message);
      } else {
        const message = translate("errors.generation.serverError", { status: response.status });
        callbacks.onError?.(message);
        throw new Error(message);
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
                translate("errors.generation.imageFailedGeneric");
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
            // Abort before onComplete to prevent fetchEventSource from reconnecting
            // with a potentially expired token after the server closes the stream.
            abortController.abort();
            const documentId = streamedResponse.id ?? parsed.data;
            callbacks.onComplete?.(documentId, streamedResponse);
            break;
          }
          case "error":
            callbacks.onError?.(parsed.data);
            abortController.abort();
            break;
          case "account_locked": {
            let payload: unknown = { reason: parsed.data };
            try {
              const body = JSON.parse(parsed.data);
              if (body && typeof body === "object") payload = body;
            } catch {
              // A plain reason string.
            }
            const locked = handleAccountLocked(payload);
            callbacks.onError?.(locked.message);
            abortController.abort();
            break;
          }
        }
      } catch (e) {
        console.error("[SSE] Parse error:", e, "Raw data:", event.data);
      }
    },
    onerror(error) {
      if (abortController.signal.aborted) {
        // Stream was cleanly completed and we aborted — stop retrying.
        throw error;
      }
      // For transient network errors: log and let fetchEventSource reconnect.
      // The custom fetch above will get a fresh token on the next attempt.
      console.warn("[SSE] Transient error, will retry:", error);
      // Returning undefined (implicit) allows fetchEventSource to reconnect.
    },
  });

  return () => {
    abortController.abort();
  };
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: string; baseContentVersion?: string }
): Promise<Document> {
  const response = await apiClient.put<Document>(`/documents/${id}`, data);
  return response.data;
}

/** "Está correto": the teacher confirmed an exercise flagged by the answer-key check. */
export async function dismissAnswerCheck(id: string, exerciseId: string): Promise<void> {
  await apiClient.delete(`/documents/${id}/answer-checks/${encodeURIComponent(exerciseId)}`);
}

/**
 * Send a chat message to update a document via AI
 * Returns updated document with chatAnswer
 */
/** Above the server's own AI timeout (180 s), so the server's typed timeout answer wins over a client abort. */
export const CHAT_REQUEST_TIMEOUT_MS = 200_000;

export async function chatWithDocument(
  id: string,
  message: string,
  canvasState?: string,
  options: { pendingReview?: boolean; selection?: string; attachment?: ChatAttachment } = {},
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>(
    `/documents/${id}/chat`,
    {
      chatMessage: message,
      ...(canvasState ? { canvasState } : {}),
      ...(options.pendingReview ? { pendingReview: true } : {}),
      ...(options.selection ? { selection: options.selection } : {}),
      ...(options.attachment ? { attachmentName: options.attachment.name, attachmentText: options.attachment.text } : {}),
    },
    { timeout: CHAT_REQUEST_TIMEOUT_MS },
  );
  return response.data;
}

/** Progress of a streamed chat turn (ENG-402). */
export interface ChatStreamProgress {
  stage: "reading" | "editing" | "answering";
  section?: string;
}

/** Thrown when the stream could not start: the caller falls back to the plain request. */
export class ChatStreamUnavailableError extends Error {}

/**
 * The chat turn streamed (POST /documents/{id}/chat/stream): status and reply text as they arrive, then the same
 * response as {@link chatWithDocument}. A failure before the first frame throws ChatStreamUnavailableError.
 */
export async function streamChatWithDocument(
  id: string,
  message: string,
  options: { pendingReview?: boolean; selection?: string; attachment?: ChatAttachment },
  callbacks: { onProgress?: (p: ChatStreamProgress) => void; onAnswer?: (delta: string) => void },
): Promise<ChatResponse> {
  const token = await getApiToken();
  const base = process.env.NEXT_PUBLIC_BASE_API_URL || "";
  let response: Response;
  try {
    response = await fetch(`${base}/documents/${id}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        chatMessage: message,
        ...(options.pendingReview ? { pendingReview: true } : {}),
        ...(options.selection ? { selection: options.selection } : {}),
        ...(options.attachment ? { attachmentName: options.attachment.name, attachmentText: options.attachment.text } : {}),
      }),
    });
  } catch {
    throw new ChatStreamUnavailableError("network");
  }
  if (!response.ok || !response.body) {
    throw new ChatStreamUnavailableError(`http_${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawFrame = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = raw
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      let frame: { type?: string; stage?: string; section?: string; data?: unknown; code?: string };
      try {
        frame = JSON.parse(data);
      } catch {
        continue;
      }
      sawFrame = true;
      if (frame.type === "status" && frame.stage) {
        callbacks.onProgress?.({ stage: frame.stage as ChatStreamProgress["stage"], section: frame.section });
      } else if (frame.type === "answer" && typeof frame.data === "string") {
        callbacks.onAnswer?.(frame.data);
      } else if (frame.type === "done") {
        return frame.data as ChatResponse;
      } else if (frame.type === "error" || frame.type === "account_locked") {
        throw new ApiRequestError(frame.code ?? "chat_failed", frame.code === "not_found" ? 404 : 500, frame.code ?? null);
      }
    }
  }
  if (!sawFrame) throw new ChatStreamUnavailableError("empty");
  throw new ApiRequestError("stream_ended", 500, "upstream_unavailable");
}

/** A file attached in the chat, read on the server (ENG-410). */
export interface ChatAttachment {
  name: string;
  text: string;
  truncated: boolean;
}

/** Reads a PDF/Word/text file's text for the next chat message. Rejects with ApiRequestError (code: why). */
export async function uploadChatAttachment(id: string, file: File): Promise<ChatAttachment> {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post<ChatAttachment>(`/documents/${id}/chat/attachments`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/** The document's stored conversation, oldest first (ENG-396). */
export async function getChatHistory(id: string): Promise<ChatHistoryMessage[]> {
  const response = await apiClient.get<{ messages: ChatHistoryMessage[] }>(`/documents/${id}/chat`);
  return response.data.messages ?? [];
}

/** "Nova conversa": the assistant stops seeing the previous turns. */
export async function clearChatHistory(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}/chat`);
}

/** The teacher finished reviewing the AI's proposed changes (ENG-408). */
export async function discardPendingAiEdit(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}/chat/pending`);
}

export async function generateSlide(
  id: string,
  topic: string | undefined,
  canvasState: string
): Promise<GenerateSlideResponse> {
  const response = await apiClient.post<GenerateSlideResponse>(
    `/documents/${id}/slides/generate`,
    {
      ...(topic?.trim() ? { topic: topic.trim() } : {}),
      canvasState,
    }
  );
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
 * The client stopped waiting but the server job is still running: the document appears in the
 * teacher's list once it finishes, so callers should say that rather than report a failure.
 */
export class DocumentStillProcessingError extends Error {}

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
      if (isFailedDocumentStatus(doc.status)) {
        // For "error" the backend saves the specific message into 'content'. A "failed"
        // document (e.g. swept after a dead task) may hold empty or partial content instead.
        const message = doc.status === "error" ? doc.content : "";
        throw new Error(message || translate("errors.documents.processingFormatFailed"));
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
        throw new Error(
          translate("errors.documents.importServerError", { status: axiosError.response.status }),
        );
      }
      
      // Otherwise (e.g., 404 or network hiccup), just wait and try again
    }
    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new DocumentStillProcessingError(translate("errors.documents.importTimeout"));
}

/**
 * Version history of a document, newest first.
 */
export async function getDocumentVersions(
  documentId: string
): Promise<DocumentVersionSummary[]> {
  const response = await apiClient.get<DocumentVersionSummary[]>(
    `/documents/${encodeURIComponent(documentId)}/versions`
  );
  return response.data;
}

/**
 * One version of a document, including its content.
 */
export async function getDocumentVersion(
  documentId: string,
  versionId: string
): Promise<DocumentVersionDetail> {
  const response = await apiClient.get<DocumentVersionDetail>(
    `/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}`
  );
  return response.data;
}

/**
 * Make an old version the document's content again. The previous current
 * version is kept in the history. Returns the updated document.
 */
export async function restoreDocumentVersion(
  documentId: string,
  versionId: string
): Promise<Document> {
  const response = await apiClient.post<Document>(
    `/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/restore`
  );
  return normalizeDocument(response.data);
}
