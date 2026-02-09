/**
 * Assistant API Service
 * Handles communication with the Scooli Assistant backend via SSE streaming.
 */

import { fetchEventSource } from "@microsoft/fetch-event-source";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatStreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: string) => void;
}

interface StreamEvent {
  type: "content" | "done" | "error";
  data: string;
}

/**
 * Stream a chat message to the assistant and receive the response via SSE.
 * @param message The user's message
 * @param history Previous conversation history (for context)
 * @param callbacks Callbacks for handling stream events
 * @param authToken Authentication token for the request
 * @returns A function to abort the stream
 */
export async function streamChatMessage(
  message: string,
  history: ChatHistoryItem[],
  callbacks: ChatStreamCallbacks,
  authToken: string
): Promise<() => void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL || "";
  const url = `${baseUrl}/assistant/chat/stream`;
  const abortController = new AbortController();
  let accumulatedContent = "";

  try {
    await fetchEventSource(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ message, history }),
      signal: abortController.signal,

      async onopen(response) {
        if (!response.ok) {
          if (response.status === 401) {
            callbacks.onError("Sessão expirada. Por favor, faz login novamente.");
            throw new Error("Unauthorized");
          }
          if (response.status === 402) {
            callbacks.onError("Limite de gerações atingido. Faz upgrade do plano para continuar.");
            throw new Error("Payment Required");
          }
          callbacks.onError(`Erro no servidor: ${response.status}`);
          throw new Error(`Server error: ${response.status}`);
        }
      },

      onmessage(event) {
        try {
          const parsed: StreamEvent = JSON.parse(event.data);

          switch (parsed.type) {
            case "content":
              accumulatedContent += parsed.data;
              callbacks.onChunk(parsed.data);
              break;

            case "done":
              callbacks.onComplete(accumulatedContent);
              abortController.abort();
              break;

            case "error":
              callbacks.onError(parsed.data);
              abortController.abort();
              break;
          }
        } catch (e) {
          console.error("[Assistant SSE] Parse error:", e, "Raw data:", event.data);
        }
      },

      onerror(error) {
        console.error("[Assistant SSE] Error:", error);
        callbacks.onError("Erro de conexão. Tenta novamente.");
        throw error;
      },
    });
  } catch (error) {
    // Non-fatal errors (like abort) are expected
    if (error instanceof Error && error.name === "AbortError") {
      // Stream was aborted intentionally
      return () => {};
    }
    // Re-throw other errors
    throw error;
  }

  return () => {
    abortController.abort();
  };
}
