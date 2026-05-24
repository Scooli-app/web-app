/**
 * Subscribes to a JSON-document generation SSE stream and exposes the
 * status-only progress to the editor UI. SCOOL-133.
 *
 * The backend (SCOOL-127) emits these event types for content_format=json:
 *
 *   - status        {phase: "preparing"|"generating"|"reviewing"}
 *   - image_progress {completed, total, blockId, status}
 *   - heartbeat     {} — every ~10s, ignored on the client
 *   - done          {documentId} — final
 *   - error         {message}
 *
 * No "content" events are emitted. Once the hook reports {@code phase==="done"},
 * the caller should fetch the document via the normal {@code GET /documents/:id}
 * endpoint and transition into the editor.
 */
"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

export type GenerationPhase = "preparing" | "generating" | "reviewing" | "done";

export interface ImageProgress {
  completed: number;
  total: number;
}

export interface UseGenerationProgressResult {
  phase: GenerationPhase;
  imageProgress: ImageProgress | null;
  error: string | null;
  /** True once the {@code done} event has been received. */
  isDone: boolean;
}

export interface UseGenerationProgressOptions {
  /** Document id; the stream URL is {@code /documents/:id/stream}. Pass null to pause. */
  documentId: string | null;
}

/** Subscribe to the status-only SSE for a JSON document generation. */
export function useGenerationProgress({
  documentId,
}: UseGenerationProgressOptions): UseGenerationProgressResult {
  const { getToken } = useAuth();
  const [phase, setPhase] = useState<GenerationPhase>("preparing");
  const [imageProgress, setImageProgress] = useState<ImageProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      const { fetchEventSource } = await import("@microsoft/fetch-event-source");
      const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL || "";
      const url = `${baseUrl}/documents/${documentId}/stream`;

      try {
        await fetchEventSource(url, {
          signal: ctrl.signal,
          fetch: async (input, init) => {
            const token = await getToken();
            const headers = new Headers(init?.headers);
            if (token) headers.set("Authorization", `Bearer ${token}`);
            return window.fetch(input, { ...init, headers });
          },
          onopen: async (resp) => {
            if (resp.ok) return;
            if (!cancelled) setError(`Erro do servidor: ${resp.status}`);
            throw new Error(`SSE open failed: ${resp.status}`);
          },
          onmessage(event) {
            if (cancelled) return;
            // Heartbeats arrive as empty data; skip parsing those.
            if (!event.data) return;
            // Some browsers deliver the event type on `event.event`; the
            // fetch-event-source library puts it there too.
            const type = event.event || "message";

            // The Markdown stream uses {type, data} envelopes; the JSON stream
            // uses event-type SSE fields. Support both for defensive coding.
            let payload: Record<string, unknown> = {};
            try {
              payload = JSON.parse(event.data);
            } catch {
              // Heartbeat or malformed — ignore.
              return;
            }

            switch (type) {
              case "status": {
                const phaseValue = String(payload.phase ?? "");
                if (
                  phaseValue === "preparing" ||
                  phaseValue === "generating" ||
                  phaseValue === "reviewing"
                ) {
                  setPhase(phaseValue);
                }
                return;
              }
              case "image_progress": {
                const completed = Number(payload.completed ?? 0);
                const total = Number(payload.total ?? 0);
                setImageProgress({ completed, total });
                return;
              }
              case "done": {
                setPhase("done");
                setIsDone(true);
                ctrl.abort();
                return;
              }
              case "error": {
                setError(String(payload.message ?? "Erro desconhecido"));
                ctrl.abort();
                return;
              }
              case "heartbeat":
              default:
                // ignore
                return;
            }
          },
          onerror(err) {
            // Throwing here stops automatic reconnect; we want manual control.
            if (!cancelled) setError(err?.message ?? "Erro de ligação");
            throw err;
          },
          openWhenHidden: true,
        });
      } catch {
        // Swallow — error already surfaced via state.
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [documentId, getToken]);

  return { phase, imageProgress, error, isDone };
}
