import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INTERFACE_LOCALE_STORAGE_KEY,
  resolveEffectiveContentLanguage,
  resolveEffectiveInterfaceLocale,
} from "./clientLocale";

function stubBrowser({ stored, cookie }: { stored?: string; cookie?: string }) {
  vi.stubGlobal("window", { location: { protocol: "http:" } });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === INTERFACE_LOCALE_STORAGE_KEY ? stored ?? null : null),
  });
  vi.stubGlobal("document", { cookie: cookie ?? "" });
  vi.stubGlobal("navigator", { language: "en-US", languages: ["en-US"] });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveEffectiveInterfaceLocale", () => {
  it("honours an explicit choice", () => {
    stubBrowser({});
    expect(resolveEffectiveInterfaceLocale("en")).toBe("en");
  });

  it("follows the NEXT_LOCALE cookie the interface was rendered with when nothing was chosen", () => {
    stubBrowser({ cookie: "NEXT_LOCALE=en" });
    expect(resolveEffectiveInterfaceLocale("system")).toBe("en");
  });

  it("stays on pt-PT without a choice or a cookie, ignoring the browser language", () => {
    stubBrowser({});
    expect(resolveEffectiveInterfaceLocale("system")).toBe("pt-PT");
  });

  it("follows the browser once the teacher chose to", () => {
    stubBrowser({ stored: "system" });
    expect(resolveEffectiveInterfaceLocale("system")).toBe("en");
  });
});

describe("resolveEffectiveContentLanguage", () => {
  it("generates in the language the interface is shown in", () => {
    stubBrowser({ cookie: "NEXT_LOCALE=en" });
    expect(resolveEffectiveContentLanguage("interface", "system")).toBe("en");
  });
});
