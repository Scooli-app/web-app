import { ApiRequestError, UpgradeLimitError } from "@/services/api/client";
import { describe, expect, it } from "vitest";
import { isChatFailure, toChatFailure } from "./chatErrors";

describe("toChatFailure", () => {
  it("tells a client timeout from a dropped connection", () => {
    expect(toChatFailure(new ApiRequestError("x", 0, "timeout")).kind).toBe("timeout");
    expect(toChatFailure(new ApiRequestError("x", 0, null)).kind).toBe("network");
  });

  it("maps the server's typed timeout and other statuses", () => {
    expect(toChatFailure(new ApiRequestError("x", 504, "timeout")).kind).toBe("timeout");
    expect(toChatFailure(new ApiRequestError("x", 404, null)).kind).toBe("notFound");
    expect(toChatFailure(new ApiRequestError("x", 500, "upstream_unavailable"))).toEqual({
      kind: "server",
      message: null,
      status: 500,
      errorCode: "upstream_unavailable",
    });
  });

  it("keeps the plan-limit message and checks a locked account first", () => {
    expect(toChatFailure(new UpgradeLimitError("limite"))).toMatchObject({ kind: "upgrade", message: "limite" });
    const locked = new UpgradeLimitError("conta bloqueada");
    locked.name = "AccountLockedError";
    expect(toChatFailure(locked).kind).toBe("locked");
  });

  it("never throws on unknown values", () => {
    expect(toChatFailure("boom").kind).toBe("server");
    expect(isChatFailure(toChatFailure(undefined))).toBe(true);
    expect(isChatFailure("x")).toBe(false);
  });
});
