// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import pt from "../../../../messages/pt-PT.json";
import { toast } from "sonner";
import { ApiRequestError } from "@/services/api/client";
import { getSchoolSourceQuota, listSchoolSources, updateSchoolSource } from "@/services/api/school-sources.service";
import { ALL_YEARS, LONG_NAME, MAX_SUBJECTS } from "@/shared/test/longContent";
import type { SchoolSource, SchoolSourceQuota } from "@/shared/types/sources";
import { SchoolSourcesPanel } from "./SchoolSourcesPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
const DYNAMIC = ["type.regra.title", "type.regra.hint", "type.apoio.title", "type.apoio.hint", "size.kb", "size.mb", "size.gb", "years.range", "years.list", "quota", "all"];

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

const school = (over: Partial<SchoolSource>): SchoolSource => ({
  id: "s1", name: "Regulamento interno", type: "regra", subjects: [], schoolYears: [], defaultEnabled: true, status: "indexed",
  chunkCount: 3, fileSizeBytes: 140 * 1024, fileKind: "pdf", uploadedByName: null, createdAt: "2026-11-22T10:00:00Z",
  lastError: null, hasSummary: false, ...over,
});

async function mountPanel(list: SchoolSource[], quota?: Partial<SchoolSourceQuota>) {
  vi.mocked(listSchoolSources).mockResolvedValue(list);
  vi.mocked(getSchoolSourceQuota).mockResolvedValue({ filesUsed: 0, filesMax: 50, bytesUsed: 0, bytesMax: 2 ** 31, maxFileBytes: 25 * 2 ** 20, ...quota });
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="pt-PT" messages={pt}>
        <SchoolSourcesPanel />
      </NextIntlClientProvider>,
    );
  });
  return container;
}

const openMenu = async (row: Element) => {
  const trigger = row.querySelector<HTMLButtonElement>("button[aria-haspopup]");
  await act(async () => trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
};

describe("SchoolSourcesPanel rows", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("lists 50 sources, clamping long names and all-subject, all-year tags with the full text in the title", async () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      school({ id: `s${i}`, name: i === 0 ? LONG_NAME : `Fonte ${i}`, subjects: MAX_SUBJECTS, schoolYears: ALL_YEARS }),
    );
    const c = await mountPanel(many);
    expect(c.querySelectorAll('[data-testid="school-source-row"]')).toHaveLength(50);
    const name = c.querySelector<HTMLElement>(`[title="${LONG_NAME}"]`);
    expect(name?.className).toContain("line-clamp-2");
    const tags = name?.nextElementSibling as HTMLElement;
    expect(tags.className).toContain("line-clamp-2");
    expect(tags.title).toContain("1.º–12.º");
    // the menu stays a sibling of the text, never pushed out by it
    expect(c.querySelector('[data-testid="school-source-row"] > button[aria-haspopup]')).not.toBeNull();
  });

  it("marks a failed source and says what to do", async () => {
    const c = await mountPanel([school({ status: "failed" })]);
    expect(c.textContent).toContain(pt.schoolSources.status.failed);
    expect(c.textContent).toContain(pt.schoolSources.status.failedHint);
  });

  it("disables edit, toggle and delete while a source indexes", async () => {
    const c = await mountPanel([school({ status: "embedding" })]);
    const items = await openMenu(c.querySelector('[data-testid="school-source-row"]') as Element);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.getAttribute("aria-disabled") === "true")).toBe(true);
  });

  it("toasts a 409 in the admin's language and reloads the list", async () => {
    const c = await mountPanel([school({})]);
    vi.mocked(updateSchoolSource).mockRejectedValueOnce(new ApiRequestError("Esta fonte ainda…", 409, "source_indexing"));
    vi.mocked(listSchoolSources).mockClear();
    const items = await openMenu(c.querySelector('[data-testid="school-source-row"]') as Element);
    await act(async () => items[1].click());
    expect(toast.error).toHaveBeenLastCalledWith(pt.schoolSources.errors.indexing);
    expect(listSchoolSources).toHaveBeenCalled();
  });

  it.each([
    [{ filesUsed: 50 }, pt.schoolSources.quotaFull.files.replace("{max}", "50")],
    [{ bytesUsed: 2 ** 31 }, pt.schoolSources.quotaFull.bytes.replace("{max}", "2 GB")],
  ])("disables Adicionar with the reason when the quota is full (%j)", async (quota, reason) => {
    const c = await mountPanel([school({})], quota);
    const add = [...c.querySelectorAll("button")].find((b) => b.textContent?.includes(pt.schoolSources.add));
    expect(add?.disabled).toBe(true);
    expect(c.textContent).toContain(reason);
  });

  it("keeps Adicionar enabled below the limits", async () => {
    const c = await mountPanel([school({})], { filesUsed: 49 });
    const add = [...c.querySelectorAll("button")].find((b) => b.textContent?.includes(pt.schoolSources.add));
    expect(add?.disabled).toBe(false);
  });
});
