import { ERROR_MESSAGES, UI_CONFIG } from "./constants";

/**
 * Utility functions for RAG operations
 */

export interface StreamResponse {
  type: "start" | "token" | "end" | "error";
  content?: string;
  sources?: string[];
  error?: string;
  message?: string;
}

export interface RagQueryParams {
  question: string;
}

export interface RagError {
  message: string;
  status?: number;
}

/**
 * Processes Server-Sent Events stream from RAG API
 */
export async function processRagStream(
  response: Response,
  onStart: (sources: string[]) => void,
  onToken: (content: string) => void,
  onEnd: () => void,
  onError: (error: string) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(ERROR_MESSAGES.STREAM_ERROR);
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data: StreamResponse = JSON.parse(line.slice(6));

            switch (data.type) {
              case "start":
                onStart(data.sources || []);
                break;
              case "token":
                if (data.content) {
                  onToken(data.content);
                }
                break;
              case "end":
                onEnd();
                break;
              case "error":
                onError(
                  data.error || data.message || ERROR_MESSAGES.UNKNOWN_ERROR
                );
                break;
            }
          } catch (e) {
            console.error("Erro ao processar stream:", e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Sends RAG query to API
 */
export async function sendRagQuery(question: string): Promise<Response> {
  const response = await fetch("/api/rag-query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || ERROR_MESSAGES.PROCESSING_ERROR);
  }

  return response;
}

/**
 * Validates question input
 */
export function validateQuestion(question: string): string | null {
  if (!question || question.trim().length === 0) {
    return ERROR_MESSAGES.QUESTION_REQUIRED;
  }

  if (question.trim().length < UI_CONFIG.MIN_QUESTION_LENGTH) {
    return ERROR_MESSAGES.QUESTION_TOO_SHORT;
  }

  if (question.trim().length > UI_CONFIG.MAX_QUESTION_LENGTH) {
    return ERROR_MESSAGES.QUESTION_TOO_LONG;
  }

  return null;
}
