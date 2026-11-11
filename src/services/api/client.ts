/**
 * API Client Configuration
 * Base axios instance for Chalkboard backend
 */

export class UpgradeLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpgradeLimitError";
  }
}

/**
 * The account is read-only (Pro trial ended or never activated, ENG-314) and the server refused
 * a locked action. The paywall is already open; callers treat it like any other upgrade limit
 * (no error toast).
 */
export class AccountLockedError extends UpgradeLimitError {
  readonly reason: LockReason | null;
  readonly action: LockedAction | null;

  constructor(message: string, reason: LockReason | null, action: LockedAction | null) {
    super(message);
    this.name = "AccountLockedError";
    this.reason = reason;
    this.action = action;
  }
}

/**
 * True for an upgrade limit or a read-only lock, also once a Redux thunk has serialised the
 * error to `{name, message}` (thunks rethrow these instead of turning them into a message).
 * The paywall is already open: callers show no error of their own.
 */
export function isUpgradeLimitFailure(error: unknown): boolean {
  if (error instanceof UpgradeLimitError) return true;
  const name = error && typeof error === "object" ? (error as { name?: unknown }).name : null;
  return name === "UpgradeLimitError" || name === "AccountLockedError";
}

/**
 * A failed API call. The message is the same as before (backend message or a
 * translated fallback); `status` and the backend's `code` (its `code` field,
 * else its `error` field) are kept so callers can pick a specific message. `status` is 0 when no
 * response arrived (offline, timeout, CORS).
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import {
  isAccountLockedPayload,
  isLockReason,
  lockUpgradeReason,
  type LockReason,
  type LockedAction,
  type UpgradeReason,
} from "@/shared/types/plan-limits";
import { markPlanLimitsStale } from "@/hooks/planLimitsEvents";
import { translate } from "@/i18n/translate";
import { reportUiProblem } from "@/lib/reportUiProblem";
import type { UnknownAction } from "@reduxjs/toolkit";
import axios, { type AxiosError, type AxiosInstance } from "axios";
import posthog from "posthog-js";

const FREE_LIMIT_REASONS: readonly UpgradeReason[] = [
  "free_class_limit",
  "free_period_limit",
];

const isUpgradeReason = (value: unknown): value is UpgradeReason =>
  FREE_LIMIT_REASONS.includes(value as UpgradeReason);

let storeDispatch: ((action: UnknownAction) => void) | null = null;

export const injectStore = (dispatch: (action: UnknownAction) => void) => {
  storeDispatch = dispatch;
};

const LOCKED_ACTIONS: readonly LockedAction[] = ["generate", "create", "export", "duplicate", "share"];

/**
 * A blocked action while the account is read-only (403 `{code: "account_locked", reason, action}`,
 * or the same code on a stream): opens the paywall for that reason, re-reads the plan limits so
 * the rest of the UI shows the lock, and returns the error to reject with. Never an error toast.
 */
export function handleAccountLocked(payload: unknown): AccountLockedError {
  const body = (payload && typeof payload === "object" ? payload : {}) as {
    reason?: unknown;
    action?: unknown;
    error?: unknown;
  };
  const reason = isLockReason(body.reason) ? body.reason : null;
  const action = LOCKED_ACTIONS.includes(body.action as LockedAction) ? (body.action as LockedAction) : null;
  if (storeDispatch) {
    storeDispatch(openUpgradeModalForReason(lockUpgradeReason(reason)));
  }
  markPlanLimitsStale();
  const message =
    typeof body.error === "string" && body.error ? body.error : translate("billing.lock.blockedMessage");
  return new AccountLockedError(message, reason, action);
}

type GetTokenFn = () => Promise<string | null>;

let getTokenFn: GetTokenFn | null = null;

// On a hard load, components mount and fire requests before Clerk has loaded
// and AuthProvider has registered the token getter. Those requests wait here
// (bounded) instead of going out unauthenticated and failing with 401.
const TOKEN_GETTER_WAIT_MS = 10_000;
let tokenGetterWaiters: Array<(getter: GetTokenFn | null) => void> = [];

function waitForTokenGetter(): Promise<GetTokenFn | null> {
  if (getTokenFn || typeof window === "undefined") {
    return Promise.resolve(getTokenFn);
  }
  return new Promise((resolve) => {
    const waiter = (getter: GetTokenFn | null) => {
      clearTimeout(timeoutId);
      resolve(getter);
    };
    const timeoutId = setTimeout(() => {
      tokenGetterWaiters = tokenGetterWaiters.filter((w) => w !== waiter);
      resolve(getTokenFn);
    }, TOKEN_GETTER_WAIT_MS);
    tokenGetterWaiters.push(waiter);
  });
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  validateStatus: (status) => status < 400,
});

/**
 * Set the token getter function for all API requests
 * This allows fetching a fresh token for each request
 */
export function setApiTokenGetter(getter: GetTokenFn | null): void {
  getTokenFn = getter;
  if (getter) {
    const waiters = tokenGetterWaiters;
    tokenGetterWaiters = [];
    waiters.forEach((resolve) => resolve(getter));
  }
}

// Request interceptor to add auth token (fetches fresh token for each request)
apiClient.interceptors.request.use(
  async (config) => {
    const getter = await waitForTokenGetter();
    if (getter) {
      const token = await getter();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Retry interceptor: on 401, wait briefly for Clerk to finish loading,
// then retry once with a fresh token. This handles the race condition
// during page refresh / hot-reload where the first request fires before
// the auth session is fully restored.
apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const originalRequest = error.config as typeof error.config & {
    _retried?: boolean;
  };

  if (
    error.response?.status === 401 &&
    originalRequest &&
    !originalRequest._retried
  ) {
    originalRequest._retried = true;

    // Wait a short moment for Clerk to finish restoring the session
    await new Promise((resolve) => setTimeout(resolve, 500));

    const getter = await waitForTokenGetter();
    if (!getter) {
      return Promise.reject(error);
    }

    const token = await getter();
    if (token) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    }

    // Token still unavailable after retry — session has expired. Redirect to
    // sign-in so the user can re-authenticate instead of silently failing.
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  } else if (error.response?.status === 401 && originalRequest?._retried) {
    // A fresh token was refused too: a backend/auth mismatch, not an expired session.
    reportUiProblem("auth_rejected_after_refresh", {
      endpoint: originalRequest.url?.split("?")[0] ?? null,
    });
  }
  return Promise.reject(error);
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Validate response is JSON
    const contentType = response.headers["content-type"]?.toString();
    if (contentType && !contentType.includes("application/json")) {
      console.error("A API devolveu resposta não JSON:", contentType);
      throw new Error(translate("errors.api.invalidResponse"));
    }
    return response;
  },
  (error: AxiosError<{ message?: string; error?: string } | string>) => {
    // 402 = usage limit reached. Open the upgrade modal and reject with a
    // typed error so callers can distinguish it from real application errors.
    if (error.response?.status === 402) {
      if (storeDispatch) {
        storeDispatch(setUpgradeModalOpen(true));
      }
      const limitMessage =
        typeof error.response.data === "string"
          ? error.response.data
          : (error.response.data as { message?: string })?.message ||
            translate("errors.api.usageLimitExceeded");
      return Promise.reject(new UpgradeLimitError(limitMessage));
    }

    // 403 with a free-plan limit code = the free plan blocks this action (e.g.
    // a second class, or a lesson outside the 4-week window). Open the upgrade
    // modal with the matching reason, then reject like the 402 case.
    if (error.response?.status === 403) {
      if (isAccountLockedPayload(error.response.data)) {
        return Promise.reject(handleAccountLocked(error.response.data));
      }
      const code = (error.response.data as { error?: unknown } | undefined)?.error;
      if (isUpgradeReason(code)) {
        if (storeDispatch) {
          storeDispatch(openUpgradeModalForReason(code));
        }
        posthog.capture("free_limit_hit", {
          kind: code === "free_class_limit" ? "class" : "period",
        });
        const limitMessage =
          (error.response.data as { message?: string })?.message ||
          translate("errors.api.usageLimitExceeded");
        return Promise.reject(new UpgradeLimitError(limitMessage));
      }
    }

    // Handle common errors
    if (error.response) {
      // Check if response is HTML (error page)
      const contentType = error.response.headers["content-type"]?.toString();
      if (contentType && contentType.includes("text/html")) {
        const status = error.response.status;
        return Promise.reject(
          new ApiRequestError(translate("errors.api.htmlResponse", { status }), status, null)
        );
      }

      // Try to extract error message from response
      let message = translate("errors.api.genericError");
      if (typeof error.response.data === "string") {
        message = error.response.data;
      } else if (
        error.response.data &&
        typeof error.response.data === "object"
      ) {
        message =
          (error.response.data as { message?: string; error?: string })
            ?.message ||
          (error.response.data as { message?: string; error?: string })
            ?.error ||
          error.message ||
          translate("errors.api.httpError", { status: error.response.status });
      } else {
        message = translate("errors.api.httpError", { status: error.response.status });
      }

      // Newer endpoints (Pro trial) send `{code, error: message}`; older ones put the code in `error`.
      const body =
        error.response.data && typeof error.response.data === "object"
          ? (error.response.data as { code?: unknown; error?: unknown })
          : null;
      const code = typeof body?.code === "string" ? body.code : body?.error;
      return Promise.reject(
        new ApiRequestError(message, error.response.status, typeof code === "string" ? code : null)
      );
    }
    if (error.request) {
      // A client-side timeout is not a dropped connection: callers that can say so (the chat) need the difference.
      const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      return Promise.reject(
        new ApiRequestError(translate("errors.api.networkError"), 0, timedOut ? "timeout" : null)
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;
