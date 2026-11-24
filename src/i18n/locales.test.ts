import { describe, expect, it } from "vitest";
import { matchLocale, portugueseVariantFor } from "./locales";

describe("matchLocale", () => {
  it("keeps Brazilian Portuguese as its own language and sends other Portuguese to pt-PT", () => {
    expect(matchLocale("pt-BR")).toBe("pt-BR");
    expect(matchLocale("pt-br")).toBe("pt-BR");
    expect(matchLocale("pt")).toBe("pt-PT");
    expect(matchLocale("pt-AO")).toBe("pt-PT");
    expect(matchLocale("en-GB")).toBe("en");
    expect(matchLocale("fr")).toBeNull();
  });
});

describe("portugueseVariantFor", () => {
  it("defaults a Brazilian teacher to pt-BR and everyone else to pt-PT", () => {
    expect(portugueseVariantFor("BR")).toBe("pt-BR");
    expect(portugueseVariantFor("PT")).toBe("pt-PT");
    expect(portugueseVariantFor(null)).toBe("pt-PT");
  });
});
