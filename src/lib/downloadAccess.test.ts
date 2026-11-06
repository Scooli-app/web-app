import { describe, expect, it, vi } from "vitest";
import { downloadAccessDenial, resolveDownloadAccess } from "./downloadAccess";

const MESSAGES = { locked: "Conta em modo de leitura.", unavailable: "Não foi possível verificar a tua conta. Tenta novamente." };
const json = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

async function denial(fetchImpl: typeof fetch, extra: Partial<Parameters<typeof resolveDownloadAccess>[0]> = {}) {
  const access = await resolveDownloadAccess({
    baseUrl: "https://api.test",
    token: "tok",
    isOrganizationMember: false,
    fetchImpl,
    ...extra,
  });
  return { access, denial: downloadAccessDenial(access, MESSAGES) };
}

describe("/api/download access (ENG-321, fails closed)", () => {
  it("refuses a LOCKED account with 403 account_locked", async () => {
    const fetchImpl = json(200, { isPro: false, status: "LOCKED", lockReason: "trial_expired" });
    const { denial: result } = await denial(fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.test/users/me/plan-limits",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } }),
    );
    expect(result).toEqual({
      status: 403,
      body: { code: "account_locked", reason: "trial_expired", action: "export", error: MESSAGES.locked },
    });
  });

  it("refuses with 503 account_status_unavailable when the plan limits cannot be fetched", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const { denial: result } = await denial(fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ status: 503, body: { code: "account_status_unavailable", error: MESSAGES.unavailable } });
  });

  it.each([500, 502, 403, 404])("refuses with 503 on a %i from the backend", async (status) => {
    const { denial: result } = await denial(json(status, { error: "x" }) as unknown as typeof fetch);
    expect(result?.status).toBe(503);
  });

  it("refuses with 503 when the body is not JSON", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>", { status: 200 }));
    const { denial: result } = await denial(fetchImpl as unknown as typeof fetch);
    expect(result?.status).toBe(503);
  });

  it("allows an old backend without status, reading Pro from isPro", async () => {
    const free = await denial(json(200, { isPro: false, maxActiveClasses: 1, activeClasses: 0 }) as unknown as typeof fetch);
    expect(free.denial).toBeNull();
    expect(free.access).toEqual({ kind: "allowed", isPro: false });

    const pro = await denial(json(200, { isPro: true, maxActiveClasses: null, activeClasses: 2 }) as unknown as typeof fetch);
    expect(pro.access).toEqual({ kind: "allowed", isPro: true });
  });

  it("allows the trial as Pro", async () => {
    const { access } = await denial(json(200, { isPro: true, status: "TRIAL", trialDaysLeft: 12 }) as unknown as typeof fetch);
    expect(access).toEqual({ kind: "allowed", isPro: true });
  });

  it("keeps today's fallbacks: a 401 or no token use the Clerk organization, no backend means no lock", async () => {
    const unauthorized = await denial(json(401, {}) as unknown as typeof fetch, { isOrganizationMember: true });
    expect(unauthorized.access).toEqual({ kind: "allowed", isPro: true });

    const fetchImpl = vi.fn();
    const noToken = await denial(fetchImpl as unknown as typeof fetch, { token: null });
    expect(noToken.access).toEqual({ kind: "allowed", isPro: false });

    const noBackend = await denial(fetchImpl as unknown as typeof fetch, { baseUrl: "" });
    expect(noBackend.access).toEqual({ kind: "allowed", isPro: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("counts the Clerk organization as Pro even when the backend says free", async () => {
    const { access } = await denial(json(200, { isPro: false, status: "LEGACY_FREE" }) as unknown as typeof fetch, {
      isOrganizationMember: true,
    });
    expect(access).toEqual({ kind: "allowed", isPro: true });
  });
});
