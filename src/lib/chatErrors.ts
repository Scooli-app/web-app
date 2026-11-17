import { ApiRequestError, UpgradeLimitError } from "@/services/api/client";
import { isAxiosError } from "axios";

/**
 * Why a chat request failed, in terms the panel can turn into a specific message and a next step (ENG-399),
 * instead of one "try again later" for everything.
 */
export type ChatFailureKind = "upgrade" | "timeout" | "network" | "notFound" | "locked" | "server";

export interface ChatFailure {
  kind: ChatFailureKind;
  /** Server-provided text when there is one (already user-facing); never shown raw for server errors. */
  message: string | null;
  status: number | null;
  /** Typed code the server sent (`timeout`, `upstream_unavailable`, …). */
  errorCode: string | null;
}

export function toChatFailure(error: unknown): ChatFailure {
  // AccountLockedError extends UpgradeLimitError: check the narrower one first.
  if (error instanceof Error && error.name === "AccountLockedError") {
    return { kind: "locked", message: error.message, status: 403, errorCode: null };
  }
  if (error instanceof UpgradeLimitError) {
    return { kind: "upgrade", message: error.message, status: 402, errorCode: null };
  }
  if (isAxiosError(error) && (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")) {
    return { kind: "timeout", message: null, status: null, errorCode: "timeout" };
  }
  if (error instanceof ApiRequestError) {
    const status = error.status;
    if (status === 0) {
      return error.code === "timeout"
        ? { kind: "timeout", message: null, status: null, errorCode: "timeout" }
        : { kind: "network", message: null, status, errorCode: null };
    }
    if (status === 404) return { kind: "notFound", message: error.message, status, errorCode: error.code };
    if (status === 403) return { kind: "locked", message: error.message, status, errorCode: error.code };
    if (status === 504 || error.code === "timeout") {
      return { kind: "timeout", message: null, status, errorCode: "timeout" };
    }
    return { kind: "server", message: null, status, errorCode: error.code };
  }
  return { kind: "server", message: null, status: null, errorCode: null };
}

export function isChatFailure(value: unknown): value is ChatFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind: unknown }).kind === "string"
  );
}
