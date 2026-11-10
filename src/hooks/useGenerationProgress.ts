/**
 * Subscribes to a JSON-document generation SSE stream and exposes its progress — and the document as it is
 * written — to the editor UI. SCOOL-133.
 *
 * The backend emits these event types for content_format=json:
 *
 *   - status        {phase: "preparing"|"generating"|"reviewing"|"images"|"retrying"}
 *   - partial       the document generated so far (same JSON shape as the stored content, whole slides or
 *                   exercises only); the last one before "done" is the full document
 *   - image_progress {completed, total, blockId, status}
 *   - heartbeat     {} — every ~10s, ignored on the client
 *   - done          {documentId} — final
 *   - error         {message}
 *
 * "retrying" means the first attempt failed validation and a second one starts from scratch: the preview is
 * dropped. Once the hook reports {@code isDone}, the caller fetches the document via {@code GET /documents/:id}
 * and opens the editor; until then the preview is read-only (the editor must not autosave while answer keys and
 * images are still being written into the document).
 */
"use client";

import { useAuth } from "@clerk/nextjs";
import { reportUiProblem } from "@/lib/reportUiProblem";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export type GenerationPhase = "preparing" | "generating" | "reviewing" | "images" | "done";

export interface ImageProgress {
  completed: number;
  total: number;
}

/** The JSON document streamed so far (presentation or assessment), or null before the first whole item. */
export type PartialDocument = Record<string, unknown>;

export interface GenerationState {
  phase: GenerationPhase;
  imageProgress: ImageProgress | null;
  partial: PartialDocument | null;
  /** 1 for the first attempt, 2 after a "retrying" status. */
  attempt: number;
}

export const INITIAL_GENERATION_STATE: GenerationState = {
  phase: "preparing",
  imageProgress: null,
  partial: null,
  attempt: 1,
};

export interface UseGenerationProgressResult extends GenerationState {
  error: string | null;
  /** True once the {@code done} event has been received. */
  isDone: boolean;
}

export interface UseGenerationProgressOptions {
  /** Document id; the stream URL is {@code /documents/:id/stream}. Pass null to pause. */
  documentId: string | null;
}

const PHASES: ReadonlySet<string> = new Set(["preparing", "generating", "reviewing", "images"]);

function isDocumentSnapshot(payload: Record<string, unknown>): boolean {
  return Array.isArray(payload.blocks) || Array.isArray(payload.sections);
}

/**
 * The state after one stream event. Pure, so the event handling is testable without a stream; side effects
 * (aborting on done/error, error messages) stay in the hook.
 */
export function applyGenerationEvent(
  state: GenerationState,
  type: string,
  payload: Record<string, unknown>,
): GenerationState {
  switch (type) {
    case "status": {
      const phase = String(payload.phase ?? "");
      if (phase === "retrying") {
        return { ...state, phase: "generating", partial: null, attempt: state.attempt + 1 };
      }
      if (PHASES.has(phase) && phase !== state.phase) {
        return { ...state, phase: phase as GenerationPhase };
      }
      return state;
    }
    case "partial":
      return isDocumentSnapshot(payload) ? { ...state, partial: payload } : state;
    case "image_progress":
      return {
        ...state,
        imageProgress: { completed: Number(payload.completed ?? 0), total: Number(payload.total ?? 0) },
      };
    case "done":
      return { ...state, phase: "done" };
    default:
      return state;
  }
}

/** Unwraps the backend's JSON envelope ({"type":"status","data":"..."}) into an event type and payload. */
export function parseGenerationEvent(
  eventName: string | undefined,
  data: string,
): { type: string; payload: Record<string, unknown> } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  let type = eventName || "message";
  let payload: Record<string, unknown> = {};
  if (
    type === "message" &&
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    typeof (parsed as Record<string, unknown>).type === "string"
  ) {
    const envelope = parsed as Record<string, unknown>;
    type = envelope.type as string;
    const inner = envelope.data;
    if (typeof inner === "string") {
      try {
        const innerParsed: unknown = JSON.parse(inner);
        payload =
          innerParsed !== null && typeof innerParsed === "object" && !Array.isArray(innerParsed)
            ? (innerParsed as Record<string, unknown>)
            : { _raw: inner };
      } catch {
        // plain string data (e.g. done event carries documentId)
        payload = { _raw: inner };
      }
    } else if (typeof inner === "object" && inner !== null) {
      payload = inner as Record<string, unknown>;
    }
  } else if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    payload = parsed as Record<string, unknown>;
  }
  return { type, payload };
}

/** Subscribe to the SSE for a JSON document generation. */
export function useGenerationProgress({
  documentId,
}: UseGenerationProgressOptions): UseGenerationProgressResult {
  const { getToken } = useAuth();
  const t = useTranslations("errors.generation");
  const [state, setState] = useState<GenerationState>(INITIAL_GENERATION_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    // A new generation (or a reconnect to one) starts from a clean preview; the server replays its latest snapshot.
    setState(INITIAL_GENERATION_STATE);
    setError(null);
    setIsDone(false);

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
            if (!cancelled) setError(t("serverError", { status: resp.status }));
            throw new Error(`SSE open failed: ${resp.status}`);
          },
          onmessage(event) {
            if (cancelled) return;
            if (!event.data) return;
            const parsed = parseGenerationEvent(event.event, event.data);
            if (!parsed) return;
            const { type, payload } = parsed;

            setState((s) => applyGenerationEvent(s, type, payload));
            if (type === "done") {
              setIsDone(true);
              ctrl.abort();
            } else if (type === "error") {
              reportUiProblem("generation_error_shown", {
                documentId,
                message: String(payload.message ?? payload._raw ?? ""),
              });
              setError(String(payload.message ?? payload._raw ?? t("unknownError")));
              ctrl.abort();
            }
          },
          onerror(err) {
            // Throwing here stops automatic reconnect; we want manual control.
            if (!cancelled) {
              reportUiProblem("generation_error_shown", { documentId, message: err?.message });
              setError(err?.message ?? t("connectionError"));
            }
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
  }, [documentId, getToken, t]);

  return { ...state, error, isDone };
}
