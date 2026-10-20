import { describe, expect, it } from "vitest";
import { getTokenOrgId, getTokenSubject } from "./tokenSubject";

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

describe("getTokenOrgId", () => {
  it("reads org_id, falls back to the v2 o.id claim, and is null without an org", () => {
    expect(getTokenOrgId(fakeJwt({ org_id: "org_1" }))).toBe("org_1");
    expect(getTokenOrgId(fakeJwt({ o: { id: "org_2" } }))).toBe("org_2");
    expect(getTokenOrgId(fakeJwt({ sub: "user_a" }))).toBeNull();
    expect(getTokenOrgId("not-a-jwt")).toBeNull();
  });
});
