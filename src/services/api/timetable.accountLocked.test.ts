import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handleAccountLocked = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ default: { get: vi.fn(), post: vi.fn() }, handleAccountLocked }));
vi.mock("@/store/featureFeedbackTrigger", () => ({ featureFeedbackTrigger: { notifyCompletion: vi.fn() } }));

import { generateLesson } from "./timetable.service";

function sseResponse(lines: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(lines.map((l) => `${l}\n`).join("")));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const getToken = async () => "token";
const event = (name: string, data: string) => `data: ${JSON.stringify({ event: name, data })}`;

beforeEach(() => {
  handleAccountLocked.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lesson generation stream: account_locked (ENG-321)", () => {
  it("stops through onAccountLocked and opens the paywall with the event's reason", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([event("account_locked", "trial_expired")])));
    const callbacks = { onAccountLocked: vi.fn(), onQuotaExceeded: vi.fn(), onError: vi.fn() };

    await generateLesson("tt", "slot", undefined, callbacks, getToken);

    expect(callbacks.onAccountLocked).toHaveBeenCalledTimes(1);
    expect(callbacks.onQuotaExceeded).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(handleAccountLocked).toHaveBeenCalledWith({ reason: "trial_expired" });
  });

  it("accepts a JSON body as the event data", async () => {
    const data = JSON.stringify({ reason: "trial_not_activated", action: "generate" });
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([event("account_locked", data)])));

    await generateLesson("tt", "slot", undefined, { onQuotaExceeded: vi.fn() }, getToken);

    expect(handleAccountLocked).toHaveBeenCalledWith({ reason: "trial_not_activated", action: "generate" });
  });

  it("falls back to onQuotaExceeded (the existing 'a limit stopped it' path) before opening the paywall", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([event("account_locked", "trial_expired")])));
    const order: string[] = [];
    handleAccountLocked.mockImplementation(() => order.push("paywall"));
    const callbacks = { onQuotaExceeded: vi.fn(() => order.push("quota")), onError: vi.fn() };

    await generateLesson("tt", "slot", undefined, callbacks, getToken);

    // The paywall comes last so its lock copy replaces the generic modal the quota callback opens.
    expect(order).toEqual(["quota", "paywall"]);
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("handles a 403 account_locked response before the stream starts, without an error", async () => {
    const body = { code: "account_locked", reason: "trial_expired", action: "generate", error: "Bloqueado" };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 403 })));
    const callbacks = { onAccountLocked: vi.fn(), onError: vi.fn() };

    await generateLesson("tt", "slot", undefined, callbacks, getToken);

    expect(callbacks.onAccountLocked).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(handleAccountLocked).toHaveBeenCalledWith(body);
  });

  it("keeps reporting other HTTP failures through onError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "x" }), { status: 403 })));
    const callbacks = { onAccountLocked: vi.fn(), onError: vi.fn() };

    await generateLesson("tt", "slot", undefined, callbacks, getToken);

    expect(callbacks.onError).toHaveBeenCalledWith("HTTP 403");
    expect(handleAccountLocked).not.toHaveBeenCalled();
  });
});
