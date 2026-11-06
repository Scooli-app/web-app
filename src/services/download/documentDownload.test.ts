import { afterEach, describe, expect, it, vi } from "vitest";

const handleAccountLocked = vi.hoisted(() => vi.fn((payload: unknown) => Object.assign(new Error("locked"), { payload })));
vi.mock("posthog-js", () => ({ default: { get_distinct_id: () => null, get_session_id: () => null } }));
vi.mock("@/services/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/services/api/client")>("@/services/api/client");
  return { ApiRequestError: actual.ApiRequestError, handleAccountLocked };
});

import { ApiRequestError } from "@/services/api/client";
import { downloadDocument } from "./documentDownload";

const respond = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

afterEach(() => {
  vi.unstubAllGlobals();
  handleAccountLocked.mockClear();
});

const OPTIONS = { title: "Plano", content: "# Plano", format: "pdf" as const, images: [] };

describe("downloadDocument: the export route's refusals", () => {
  it("opens the paywall on 403 account_locked", async () => {
    const body = { code: "account_locked", reason: "trial_expired", action: "export", error: "Bloqueado" };
    respond(403, body);
    await expect(downloadDocument(OPTIONS)).rejects.toThrow("locked");
    expect(handleAccountLocked).toHaveBeenCalledWith(body);
  });

  it("rejects 503 account_status_unavailable as a retryable error, without the paywall", async () => {
    respond(503, { code: "account_status_unavailable", error: "Não foi possível verificar a tua conta. Tenta novamente." });
    const error = await downloadDocument(OPTIONS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 503, code: "account_status_unavailable", message: "Não foi possível verificar a tua conta. Tenta novamente." });
    expect(handleAccountLocked).not.toHaveBeenCalled();
  });
});
