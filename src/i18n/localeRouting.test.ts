import { describe, expect, it } from "vitest";
import { resolveRequestLocale } from "./locales";
import {
  isLocaleRewritable,
  localePrefixOf,
  withLocalePrefix,
  withoutLocalePrefix,
} from "./localeRouting";

describe("resolveRequestLocale", () => {
  it("keeps a supported cookie value", () => {
    expect(resolveRequestLocale("en")).toBe("en");
    expect(resolveRequestLocale("pt-PT")).toBe("pt-PT");
  });

  it("falls back to pt-PT for a missing, empty or unsupported cookie", () => {
    for (const value of [undefined, "", "fr", "EN", "pt"]) {
      expect(resolveRequestLocale(value)).toBe("pt-PT");
    }
  });
});

describe("isLocaleRewritable", () => {
  it("rewrites page paths", () => {
    for (const path of ["/dashboard", "/worksheet/abc-123", "/sign-in/factor-one", "/apiary", "/"]) {
      expect(isLocaleRewritable(path), path).toBe(true);
    }
  });

  it("never rewrites route handlers, proxies, files or already-prefixed paths", () => {
    for (const path of [
      "/api/download",
      "/api",
      "/trpc/x",
      "/webhooks/stripe",
      "/.well-known/assetlinks.json",
      "/_ph/e",
      "/ingest/decide",
      "/_next/data/x",
      "/robots.txt",
      "/sitemap.xml",
      "/en/dashboard",
      "/pt-PT",
    ]) {
      expect(isLocaleRewritable(path), path).toBe(false);
    }
  });
});

describe("localePrefixOf", () => {
  it("returns the locale a path starts with", () => {
    expect(localePrefixOf("/en/dashboard")).toBe("en");
    expect(localePrefixOf("/pt-PT")).toBe("pt-PT");
    expect(localePrefixOf("/pt-PT/")).toBe("pt-PT");
  });

  it("returns null when the first segment is not a locale", () => {
    expect(localePrefixOf("/english")).toBeNull();
    expect(localePrefixOf("/dashboard")).toBeNull();
    expect(localePrefixOf("/")).toBeNull();
  });
});

describe("withLocalePrefix", () => {
  it("puts the locale in front of the path", () => {
    expect(withLocalePrefix("/dashboard", "en")).toBe("/en/dashboard");
    expect(withLocalePrefix("/", "pt-PT")).toBe("/pt-PT");
  });
});

describe("withoutLocalePrefix", () => {
  it("drops a leading locale segment", () => {
    expect(withoutLocalePrefix("/en/dashboard")).toBe("/dashboard");
    expect(withoutLocalePrefix("/en")).toBe("/");
    expect(withoutLocalePrefix("/pt-PT/calendar/mes")).toBe("/calendar/mes");
  });

  it("leaves an unprefixed path alone", () => {
    expect(withoutLocalePrefix("/dashboard")).toBe("/dashboard");
  });
});
