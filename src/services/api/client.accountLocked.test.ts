import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/lib/reportUiProblem", () => ({ reportUiProblem: vi.fn() }));
vi.mock("@/i18n/translate", () => ({ translate: (key: string) => key }));

import { onPlanLimitsStale } from "@/hooks/planLimitsEvents";
import apiClient, {
  AccountLockedError,
  ApiRequestError,
  UpgradeLimitError,
  injectStore,
  isUpgradeLimitFailure,
} from "./client";

function respondWith(status: number, data: unknown) {
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const response = {
      data,
      status,
      statusText: "",
      headers: { "content-type": "application/json" },
      config,
    } as AxiosResponse;
    throw new AxiosError("Request failed", AxiosError.ERR_BAD_REQUEST, config, null, response);
  };
}

const dispatch = vi.fn();
let stale = vi.fn();
let stopListening: () => void = () => undefined;

beforeEach(() => {
  dispatch.mockReset();
  injectStore(dispatch);
  stale = vi.fn();
  stopListening = onPlanLimitsStale(stale);
});

afterEach(() => {
  stopListening();
});

describe("API client: 403 account_locked (ENG-321)", () => {
  it("opens the paywall for the lock reason, re-reads the plan limits and rejects with AccountLockedError", async () => {
    respondWith(403, { code: "account_locked", reason: "trial_expired", action: "export", error: "Conta em modo de leitura." });

    const error = await apiClient.post("/documents/1/export").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountLockedError);
    // Callers that already skip toasts for upgrade limits skip this one too.
    expect(error).toBeInstanceOf(UpgradeLimitError);
    expect(error).toMatchObject({ reason: "trial_expired", action: "export", message: "Conta em modo de leitura." });
    expect(dispatch).toHaveBeenCalledWith({ type: "ui/openUpgradeModalForReason", payload: "trial_expired" });
    expect(stale).toHaveBeenCalledTimes(1);
  });

  it("uses the generic read-only copy when the reason is missing", async () => {
    respondWith(403, { code: "account_locked", action: "generate" });

    const error = await apiClient.post("/documents").catch((e: unknown) => e);

    expect(error).toMatchObject({ reason: null, action: "generate", message: "billing.lock.blockedMessage" });
    expect(dispatch).toHaveBeenCalledWith({ type: "ui/openUpgradeModalForReason", payload: "account_locked" });
  });

  it("reads the create action (a new document without AI)", async () => {
    respondWith(403, { code: "account_locked", reason: "trial_not_activated", action: "create" });

    const error = await apiClient.post("/documents/import").catch((e: unknown) => e);

    expect(error).toMatchObject({ reason: "trial_not_activated", action: "create" });
    expect(dispatch).toHaveBeenCalledWith({ type: "ui/openUpgradeModalForReason", payload: "trial_not_activated" });
  });

  it("opens the same paywall for an action it does not know yet", async () => {
    respondWith(403, { code: "account_locked", reason: "trial_expired", action: "teleport" });

    const error = await apiClient.post("/future").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountLockedError);
    expect(error).toMatchObject({ reason: "trial_expired", action: null });
    expect(dispatch).toHaveBeenCalledWith({ type: "ui/openUpgradeModalForReason", payload: "trial_expired" });
  });

  it("keeps mapping the free-plan codes as before", async () => {
    respondWith(403, { error: "free_class_limit", message: "Limite" });

    const error = await apiClient.post("/timetable").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UpgradeLimitError);
    expect(error).not.toBeInstanceOf(AccountLockedError);
    expect(dispatch).toHaveBeenCalledWith({ type: "ui/openUpgradeModalForReason", payload: "free_class_limit" });
    expect(stale).not.toHaveBeenCalled();
  });

  it("gives trial activation errors their `code` (the message is in `error`) without opening the paywall", async () => {
    respondWith(403, { code: "trial_link_expired", error: "O link expirou." });

    const error = await apiClient.post("/users/me/trial/activate").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 403, code: "trial_link_expired", message: "O link expirou." });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("still reads the code from `error` for older endpoints", async () => {
    respondWith(409, { error: "ja_existe", message: "Já existe" });

    const error = await apiClient.post("/x").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 409, code: "ja_existe", message: "Já existe" });
  });
});

describe("isUpgradeLimitFailure", () => {
  it("recognises the lock and plan limits, also once a Redux thunk serialised them", () => {
    expect(isUpgradeLimitFailure(new AccountLockedError("x", "trial_expired", "generate"))).toBe(true);
    expect(isUpgradeLimitFailure(new UpgradeLimitError("x"))).toBe(true);
    expect(isUpgradeLimitFailure({ name: "AccountLockedError", message: "x" })).toBe(true);
    expect(isUpgradeLimitFailure({ name: "UpgradeLimitError", message: "x" })).toBe(true);
    expect(isUpgradeLimitFailure(new ApiRequestError("x", 500, null))).toBe(false);
    expect(isUpgradeLimitFailure("Failed")).toBe(false);
    expect(isUpgradeLimitFailure(undefined)).toBe(false);
  });
});
