import { registerTranslator } from "@/i18n/translate";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../../messages/en.json";
import pt from "../../../../messages/pt-PT.json";
import { formatQuota, formatTags, type SchoolSourcesT } from "./schoolSourceFormat";

function useLocale(locale: "pt-PT" | "en") {
  const messages = locale === "en" ? en : pt;
  // translateSubject reads the app-wide translator, as it does in the running app.
  registerTranslator(createTranslator({ locale, messages }) as never);
  return createTranslator({ locale, messages, namespace: "schoolSources" }) as unknown as SchoolSourcesT;
}

describe("formatTags", () => {
  it("formats tags with a year range (pt-PT)", () => {
    const t = useLocale("pt-PT");
    expect(formatTags(["Mathematics"], [7, 8, 9], t)).toBe("Matemática · 7.º–9.º");
    expect(formatTags(["Mathematics", "Natural Sciences"], [7], t)).toBe("Matemática, Ciências Naturais · 7.º");
    expect(formatTags([], [5, 7], t)).toBe("5.º, 7.º");
    expect(formatTags([], [9, 7, 8, 5], t)).toBe("5.º, 7.º–9.º");
    expect(formatTags([], [], t)).toBe("Todas");
  });

  it("is written for the English locale, not translated word for word", () => {
    const t = useLocale("en");
    expect(formatTags(["Mathematics"], [7, 8, 9], t)).toBe("Mathematics · Year 7–9");
    expect(formatTags([], [5, 7], t)).toBe("Year 5, 7");
    expect(formatTags([], [], t)).toBe("All");
  });
});

describe("formatQuota", () => {
  const quota = { filesUsed: 12, filesMax: 50, bytesUsed: 340 * 2 ** 20, bytesMax: 2 * 2 ** 30, maxFileBytes: 25 * 2 ** 20 };

  it("formats the school quota", () => {
    expect(formatQuota(quota, useLocale("pt-PT"))).toBe("12 de 50 ficheiros · 340 MB de 2 GB");
    expect(formatQuota(quota, useLocale("en"))).toBe("12 of 50 files · 340 MB of 2 GB");
  });
});
