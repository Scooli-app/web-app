// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import pt from "../../../../messages/pt-PT.json";
import { SchoolSourcesPanel } from "./SchoolSourcesPanel";

vi.mock("@/services/api/school-sources.service", () => ({
  listSchoolSources: vi.fn().mockResolvedValue([]),
  getSchoolSourceQuota: vi.fn().mockResolvedValue({ filesUsed: 0, filesMax: 50, bytesUsed: 0, bytesMax: 2 ** 31, maxFileBytes: 25 * 2 ** 20 }),
  updateSchoolSource: vi.fn(),
  deleteSchoolSource: vi.fn(),
  uploadSchoolSource: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const FILES = ["SchoolSourcesPanel.tsx", "SchoolSourceDialog.tsx", "SourceTypeCards.tsx", "schoolSourceFormat.ts"];
// Keys built from a variable: type.<regra|apoio>.title/hint, size.*, years.*, quota, all.
const DYNAMIC = ["type.regra.title", "type.regra.hint", "type.apoio.title", "type.apoio.hint", "size.mb", "size.gb", "years.range", "years.list", "quota", "all"];

const has = (obj: unknown, path: string) =>
  path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj) !== undefined;

describe("schoolSources copy", () => {
  it("has every key the components use, in both locales", () => {
    const used = new Set(DYNAMIC);
    for (const f of FILES) {
      for (const m of readFileSync(`${__dirname}/${f}`, "utf8").matchAll(/\bt\("([\w.]+)"/g)) used.add(f === "SourceTypeCards.tsx" ? `type.${m[1]}` : m[1]); // that file reads the schoolSources.type namespace
    }
    for (const [name, messages] of [["pt-PT", pt], ["en", en]] as const) {
      const missing = [...used].filter((k) => !has(messages.schoolSources, k));
      expect(missing, name).toEqual([]);
    }
  });

  it.each([["pt-PT", pt], ["en", en]] as const)("renders the page heading in %s", async (locale, messages) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SchoolSourcesPanel />
        </NextIntlClientProvider>,
      );
    });
    expect(container.querySelector("h1")?.textContent).toBe(messages.schoolSources.title);
    expect(container.textContent).not.toContain("schoolSources.");
  });
});
