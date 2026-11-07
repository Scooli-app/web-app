import posthog from "posthog-js";

/**
 * Something the teacher saw go wrong.
 *
 * The backend reports what it can detect (see chalkboard's FailureReporter, event `backend_failure`).
 * This reports what only the browser knows: an error message that was actually shown, a reply that came
 * back empty, a document that opened blank. Both land on the "Errors & Quality" PostHog dashboard.
 *
 * Why it exists: on 7-8 Oct generation failed for most teachers, yet the only related event in PostHog,
 * `document_creation_failed`, fires when the *create* request fails. The generation itself runs afterwards
 * in the editor over a stream, whose `error` event used to be shown and then forgotten.
 *
 * Pass ids and short technical context only: never document text, prompts or chat messages.
 */
export type UiProblemKind =
  /** The generation stream ended with an error the teacher was shown. */
  | "generation_error_shown"
  /** The generation stream could not even be started. */
  | "generation_stream_start_failed"
  /** The document chat request failed and the teacher saw a generic error. */
  | "chat_error_shown"
  /** The document chat answered with neither a reply nor an edit. */
  | "chat_empty_reply"
  /**
   * The assessment chat answered but left the document as it was. This also counts answers to plain questions:
   * the client cannot tell them from an edit the assistant could not apply.
   */
  | "chat_reply_without_edit"
  /** A document in `failed` state was opened. */
  | "document_opened_failed"
  /** A document marked `completed` was opened with no content. */
  | "document_opened_empty"
  /** An API call was still refused (401) after retrying with a fresh Clerk token. */
  | "auth_rejected_after_refresh";

export function reportUiProblem(
  kind: UiProblemKind,
  context: {
    documentId?: string | null;
    documentType?: string | null;
    message?: string | null;
    /** API path without the query string. */
    endpoint?: string | null;
    /** How long the teacher waited before seeing the problem. */
    durationMs?: number | null;
  } = {},
): void {
  try {
    posthog.capture("ui_problem", {
      kind,
      document_id: context.documentId ?? null,
      document_type: context.documentType ?? null,
      // Server-provided, user-facing error text; truncated defensively.
      message: context.message ? context.message.slice(0, 200) : null,
      endpoint: context.endpoint ?? null,
      duration_ms: context.durationMs ?? null,
    });
  } catch {
    // Reporting must never break the UI.
  }
}
