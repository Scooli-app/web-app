// @vitest-environment jsdom
import { configureStore } from "@reduxjs/toolkit";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import pt from "../../../../messages/pt-PT.json";
import { registerTranslator } from "@/i18n/translate";
import rootReducer from "@/store/rootReducer";
import { FeatureFlag } from "@/shared/types/featureFlags";
import type { SourceDefault, UserSource } from "@/shared/types/sources";
import { ALL_YEARS, LONG_NAME } from "@/shared/test/longContent";
import { SUBJECTS } from "../constants";
import { SourcePickerSection } from "./SourcePickerSection";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ listSources: vi.fn() }));
vi.mock("@/services/api/sources.service", () => ({
  listRegulatorySources: vi.fn().mockResolvedValue([]),
  listSources: api.listSources,
  listSourceDefaults: vi.fn().mockResolvedValue([]),
  setSourceDefault: vi.fn(),
}));

const entry = (over: Partial<SourceDefault>): SourceDefault => ({
  sourceRef: "o1", kind: "organization", type: "regra", name: "Critérios de avaliação – Matemática", effectiveDefault: true,
  startingState: true, status: "indexed", subjects: ["Mathematics"], schoolYears: [7, 8, 9], organizationId: "org",
  organizationName: "Escola", uploadedByName: null, summary: null, externalUrl: null, chunkCount: 3, ...over,
});

const personal = (over: Partial<UserSource>): UserSource =>
  ({ id: "p1", name: "Manual Matemática 7.º", status: "indexed", subject: "matematica", schoolYear: 7, chunkCount: 12, fileKind: "pdf", ...over }) as UserSource;

const DEFAULT_SCHOOL = [entry({}), entry({ sourceRef: "o2", type: "apoio", name: "Banco de fichas", subjects: ["Portuguese"], schoolYears: [5, 6] })];

async function setup(
  locale: "pt-PT" | "en",
  props: { sourceIds: string[]; subject?: string; schoolYear?: number },
  { school = DEFAULT_SCHOOL, mine = [] as UserSource[] } = {},
) {
  const messages = locale === "en" ? en : pt;
  registerTranslator(createTranslator({ locale, messages }) as never);
  api.listSources.mockResolvedValue(mine);
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      sourceDefaults: { status: "loaded", entries: school, pending: {} },
      features: { flags: { [FeatureFlag.USER_SOURCES]: true }, loading: false, loaded: true, error: null },
    } as never,
  });
  const onUpdate = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <Provider store={store}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SourcePickerSection includeAe regulatorySourceIds={[]} onUpdate={onUpdate} {...props} />
        </NextIntlClientProvider>
      </Provider>,
    );
  });
  return { container, onUpdate };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SourcePickerSection school sources", () => {
  it("shows the default school source ticked and toggles it from anywhere on the row (pt-PT)", async () => {
    const { container, onUpdate } = await setup("pt-PT", { sourceIds: ["o1"], subject: "matematica", schoolYear: 7 });
    const rows = [...container.querySelectorAll<HTMLElement>('[role="checkbox"]')].filter((r) => r.textContent?.includes("Critérios de avaliação – Matemática"));
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).toContain("Fontes da escola");
    expect(container.textContent).toContain("Regra · Matemática · 7.º–9.º");
    const meta = [...container.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Regra ·"));
    act(() => meta?.click());
    expect(onUpdate).toHaveBeenCalledWith("sourceIds", []);
    expect(container.textContent).toContain("Outras fontes da escola");
    expect(container.textContent).not.toMatch(/schoolSources\.|sourcePicker\./);
  });

  it("lists a non-matching school source unticked under the other-sources fold (en)", async () => {
    const { container } = await setup("en", { sourceIds: ["o1"], subject: "matematica", schoolYear: 7 });
    expect(container.textContent).toContain("School sources");
    expect(container.textContent).toContain("Other school sources (1)");
    const other = [...container.querySelectorAll<HTMLElement>('[role="checkbox"]')].find((r) => r.textContent?.includes("Banco de fichas"));
    expect(other?.getAttribute("aria-checked")).toBe("false");
    expect(container.textContent).not.toMatch(/schoolSources\.|sourcePicker\./);
  });

  it("does not say there are no indexed sources under a ticked school source", async () => {
    const { container } = await setup("pt-PT", { sourceIds: ["o1"], subject: "matematica", schoolYear: 7 });
    expect(container.textContent).toContain("Critérios de avaliação – Matemática");
    expect(container.textContent).not.toContain(pt.documentCreation.sourcePicker.noIndexedSourcesPrefix);
  });

  it("still invites the upload when there are no sources at all", async () => {
    const { container } = await setup("pt-PT", { sourceIds: [], subject: "matematica", schoolYear: 7 }, { school: [] });
    expect(container.textContent).toContain(pt.documentCreation.sourcePicker.noIndexedSourcesPrefix);
  });
});

describe("SourcePickerSection personal sources", () => {
  it("keeps a ticked personal source visible, so it can be unticked, even when its subject and year don't match", async () => {
    const { container, onUpdate } = await setup(
      "pt-PT",
      { sourceIds: ["p1"], subject: "portugues", schoolYear: 5 },
      { school: [], mine: [personal({}), personal({ id: "p2", name: "Manual Matemática 8.º", schoolYear: 8 })] },
    );
    const row = [...container.querySelectorAll<HTMLElement>('[role="checkbox"]')].find((r) => r.textContent?.includes("Manual Matemática 7.º"));
    expect(row?.getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).not.toContain("Manual Matemática 8.º");
    act(() => row?.click());
    expect(onUpdate).toHaveBeenCalledWith("sourceIds", []);
  });

  it("toggles a row from the keyboard (Space and Enter)", async () => {
    const { container, onUpdate } = await setup("pt-PT", { sourceIds: [], subject: "portugues", schoolYear: 5 }, { school: [], mine: [personal({ subject: null, schoolYear: null })] });
    const row = container.querySelector<HTMLElement>('[role="checkbox"][tabindex="0"]:not(button)');
    act(() => row?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
    act(() => row?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenLastCalledWith("sourceIds", ["p1"]);
  });
});

describe("SourcePickerSection with long and many sources", () => {
  it("clamps a very long name and an all-subject, all-year tag line, with the full text in the title", async () => {
    const big = entry({ sourceRef: "o9", name: LONG_NAME, subjects: SUBJECTS.map((s) => s.value), schoolYears: ALL_YEARS });
    const { container } = await setup("pt-PT", { sourceIds: ["o9"], subject: "matematica", schoolYear: 7 }, { school: [big], mine: [personal({ name: LONG_NAME })] });
    const titles = [...container.querySelectorAll<HTMLElement>(`p[title="${LONG_NAME}"]`)];
    expect(titles).toHaveLength(2); // the school row and the personal row
    expect(titles.every((el) => el.className.includes("truncate"))).toBe(true);
    const meta = [...container.querySelectorAll<HTMLElement>("p[title]")].find((el) => el.title.includes("1.º–12.º"));
    expect(meta?.className).toContain("line-clamp-2");
  });

  it("keeps 50 school sources in scrollable lists, the non-matching ones under the fold", async () => {
    const school = Array.from({ length: 50 }, (_, i) =>
      entry({ sourceRef: `o${i}`, name: `Fonte ${i}`, subjects: i < 10 ? ["Mathematics"] : ["Portuguese"], schoolYears: [7] }),
    );
    const { container } = await setup("pt-PT", { sourceIds: [], subject: "matematica", schoolYear: 7 }, { school });
    expect(container.textContent).toContain("Outras fontes da escola (40)");
    const lists = [...container.querySelectorAll<HTMLElement>(".overflow-y-auto")];
    expect(lists.map((l) => l.querySelectorAll('[role="checkbox"]').length)).toEqual([10, 40]);
  });

  it("keeps the recommended tag of the AE chip in one piece when it wraps", async () => {
    const { container } = await setup("pt-PT", { sourceIds: [], subject: "matematica", schoolYear: 7 });
    const chip = container.querySelector<HTMLElement>("button[role=checkbox]");
    const tag = [...(chip?.querySelectorAll("span") ?? [])].find((s) => s.textContent?.includes(pt.documentCreation.sourcePicker.recommended));
    expect(chip?.className).toContain("flex-wrap");
    expect(tag?.className).toContain("whitespace-nowrap");
  });
});
