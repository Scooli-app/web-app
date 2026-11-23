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
    expect(formatQuota(quota, useLocale("pt-PT"))).toBe("12 de 50 ficheiros · 340\u00a0MB de 2\u00a0GB");
    expect(formatQuota(quota, useLocale("en"))).toBe("12 of 50 files · 340\u00a0MB of 2\u00a0GB");
  });

  it("never splits a number from its unit", () => {
    expect(formatQuota(quota, useLocale("pt-PT"))).not.toMatch(/\d (KB|MB|GB)/);
  });

  it("shows KB below 1 MB, so a few small files never read as 0 MB", () => {
    const small = { ...quota, filesUsed: 1, bytesUsed: 140 * 1024 };
    expect(formatQuota(small, useLocale("pt-PT"))).toBe("1 de 50 ficheiros · 140\u00a0KB de 2\u00a0GB");
    expect(formatQuota({ ...small, bytesUsed: 0 }, useLocale("en"))).toBe("1 of 50 files · 0\u00a0MB of 2\u00a0GB");
    expect(formatQuota({ ...small, bytesUsed: 100 }, useLocale("en"))).toBe("1 of 50 files · 1\u00a0KB of 2\u00a0GB");
    // never "1024 KB": from 1023.5 KB it rounds to 1 MB
    expect(formatQuota({ ...small, bytesUsed: Math.round(1023.4 * 1024) }, useLocale("en"))).toBe("1 of 50 files · 1023\u00a0KB of 2\u00a0GB");
    expect(formatQuota({ ...small, bytesUsed: Math.round(1023.6 * 1024) }, useLocale("en"))).toBe("1 of 50 files · 1\u00a0MB of 2\u00a0GB");
  });
});
