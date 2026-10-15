import { describe, expect, it } from "vitest";
import { getBearerSubject, getTokenSubject } from "./tokenSubject";

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

describe("getBearerSubject", () => {
  it("reads the user behind a bearer header", () => {
    expect(getBearerSubject(`Bearer ${fakeJwt({ sub: "user_a" })}`)).toBe("user_a");
  });

  it("returns null when the request had no bearer token", () => {
    expect(getBearerSubject(undefined)).toBeNull();
    expect(getBearerSubject("")).toBeNull();
    expect(getBearerSubject(`Basic ${fakeJwt({ sub: "user_a" })}`)).toBeNull();
  });
});
