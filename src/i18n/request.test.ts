import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined) }),
}));
vi.mock("next-intl/server", () => ({ getRequestConfig: <T>(fn: T) => fn }));

const { default: requestConfig } = await import("./request");

async function localeFor(segment: string | undefined): Promise<string | undefined> {
  const config = await (requestConfig as unknown as (p: { requestLocale: Promise<string | undefined> }) => Promise<{ locale?: string }>)({
    requestLocale: Promise.resolve(segment),
  });
  return config.locale;
}

describe("request locale", () => {
  beforeEach(() => cookieJar.clear());

  it("uses the [locale] segment for pages, whatever the cookie says", async () => {
    cookieJar.set("NEXT_LOCALE", "pt-PT");
    expect(await localeFor("en")).toBe("en");
  });

  it("falls back to the cookie where there is no segment (route handlers such as /api/download)", async () => {
    cookieJar.set("NEXT_LOCALE", "en");
    expect(await localeFor(undefined)).toBe("en");
  });

  it("falls back to pt-PT with no segment and no usable cookie", async () => {
    expect(await localeFor(undefined)).toBe("pt-PT");
    cookieJar.set("NEXT_LOCALE", "fr");
    expect(await localeFor(undefined)).toBe("pt-PT");
  });
});
