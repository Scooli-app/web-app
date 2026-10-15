import { describe, expect, it } from "vitest";
import { cookieTokenForUser, getTokenSubject } from "./backendTokenCookie";

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fakeJwt(claims: Record<string, unknown>): string {
  return [
    base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64Url(JSON.stringify(claims)),
    "signature",
  ].join(".");
}

describe("getTokenSubject", () => {
  it("reads the sub claim", () => {
    expect(getTokenSubject(fakeJwt({ sub: "user_a" }))).toBe("user_a");
  });

  it("handles payloads that need base64url padding and characters", () => {
    const token = fakeJwt({ sub: "user_a", name: "Joséééé??>>" });
    const payload = token.split(".")[1];
    // Guard the fixture: it must use '-'/'_' and need padding to be decoded.
    expect(payload).toMatch(/[-_]/);
    expect(payload.length % 4).not.toBe(0);
    expect(getTokenSubject(token)).toBe("user_a");
  });

  it("returns null for malformed tokens", () => {
    expect(getTokenSubject("not-a-jwt")).toBeNull();
    expect(getTokenSubject("a.%%%.c")).toBeNull();
    expect(getTokenSubject(fakeJwt({ sub: 42 }))).toBeNull();
  });
});

describe("cookieTokenForUser", () => {
  const tokenForA = fakeJwt({ sub: "user_a" });

  it("keeps the cookie token issued for the signed-in user", () => {
    expect(cookieTokenForUser(tokenForA, "user_a")).toBe(tokenForA);
  });

  it("rejects a cookie left over from another user", () => {
    expect(cookieTokenForUser(tokenForA, "user_b")).toBeNull();
  });

  it("rejects the cookie when nobody is signed in or it is missing", () => {
    expect(cookieTokenForUser(tokenForA, null)).toBeNull();
    expect(cookieTokenForUser(undefined, "user_a")).toBeNull();
  });
});
