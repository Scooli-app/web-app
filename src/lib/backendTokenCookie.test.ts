import { describe, expect, it } from "vitest";
import { cookieTokenForUser } from "./backendTokenCookie";

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
});
