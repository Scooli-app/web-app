import { describe, expect, it } from "vitest";
import { cookieTokenForUser, reusableBackendToken } from "./backendTokenCookie";

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

  it("rejects an expired cookie token so the caller asks Clerk for a fresh one", () => {
    const now = Date.parse("2026-11-06T12:00:00Z");
    const expired = fakeJwt({ sub: "user_a", exp: now / 1000 - 30 });
    expect(cookieTokenForUser(expired, "user_a", now)).toBeNull();
  });

  it("rejects a cookie token that expires within the next few seconds", () => {
    const now = Date.parse("2026-11-06T12:00:00Z");
    const expiring = fakeJwt({ sub: "user_a", exp: now / 1000 + 2 });
    expect(cookieTokenForUser(expiring, "user_a", now)).toBeNull();
  });

  it("keeps a cookie token that is still valid", () => {
    const now = Date.parse("2026-11-06T12:00:00Z");
    const valid = fakeJwt({ sub: "user_a", exp: now / 1000 + 45 });
    expect(cookieTokenForUser(valid, "user_a", now)).toBe(valid);
  });
});

describe("reusableBackendToken", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const token = (claims: Record<string, unknown>, secondsLeft = 60) =>
    fakeJwt({ exp: now / 1000 + secondsLeft, ...claims });

  it("keeps a token for the same user and organization", () => {
    const t = token({ sub: "user_a", o: { id: "org_1" } });
    expect(reusableBackendToken(t, "user_a", "org_1", now)).toBe(t);
  });

  it("keeps a token for the same user when neither side has an organization", () => {
    const t = token({ sub: "user_a" });
    expect(reusableBackendToken(t, "user_a", null, now)).toBe(t);
    expect(reusableBackendToken(t, "user_a", undefined, now)).toBe(t);
  });

  it("rejects a token issued for another organization", () => {
    const t = token({ sub: "user_a", o: { id: "org_1" } });
    expect(reusableBackendToken(t, "user_a", "org_2", now)).toBeNull();
    expect(reusableBackendToken(t, "user_a", null, now)).toBeNull();
    expect(reusableBackendToken(token({ sub: "user_a" }), "user_a", "org_1", now)).toBeNull();
  });

  it("rejects a token issued for another user", () => {
    expect(reusableBackendToken(token({ sub: "user_a" }), "user_b", null, now)).toBeNull();
  });

  it("rejects a token with less than REUSE_MARGIN_MS left", () => {
    expect(reusableBackendToken(token({ sub: "user_a" }, 19), "user_a", null, now)).toBeNull();
    const fresh = token({ sub: "user_a" }, 21);
    expect(reusableBackendToken(fresh, "user_a", null, now)).toBe(fresh);
  });

  it("rejects a token without exp", () => {
    expect(reusableBackendToken(fakeJwt({ sub: "user_a" }), "user_a", null, now)).toBeNull();
  });

  it("rejects when the token or the user is missing", () => {
    expect(reusableBackendToken(undefined, "user_a", null, now)).toBeNull();
    expect(reusableBackendToken(token({ sub: "user_a" }), null, null, now)).toBeNull();
  });
});
