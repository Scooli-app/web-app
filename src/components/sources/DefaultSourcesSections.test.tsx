// @vitest-environment jsdom
import { configureStore } from "@reduxjs/toolkit";
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import pt from "../../../messages/pt-PT.json";
import { ApiRequestError } from "@/services/api/client";
import { listSourceDefaults, setSourceDefault } from "@/services/api/sources.service";
import { ALL_YEARS, LONG_NAME, MAX_SUBJECTS } from "@/shared/test/longContent";
import type { SourceDefault } from "@/shared/types/sources";
import { toast } from "sonner";
import sourceDefaults from "@/store/sources/sourceDefaultsSlice";
import { DefaultSourcesSections } from "./DefaultSourcesSections";

vi.mock("@/services/api/sources.service", () => ({ listSourceDefaults: vi.fn(), setSourceDefault: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const mk = (o: Partial<SourceDefault>): SourceDefault => ({
  sourceRef: "", kind: "personal", type: null, name: "", effectiveDefault: true, startingState: true,
  status: "indexed", subjects: [], schoolYears: [], organizationId: null, organizationName: null,
  uploadedByName: null, summary: null, externalUrl: null, chunkCount: 0, ...o,
});

function render(locale: "pt-PT" | "en", messages: typeof pt, entries: SourceDefault[], status: "loaded" | "failed" | "loading" = "loaded") {
  const store = configureStore({
    reducer: { sourceDefaults },
    preloadedState: { sourceDefaults: { entries, status, pending: {} } },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(
      <Provider store={store}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DefaultSourcesSections />
        </NextIntlClientProvider>
      </Provider>,
    );
  });
  return { container, store };
}

const entries = [
  mk({ sourceRef: "ae", kind: "ae", name: "Aprendizagens Essenciais", effectiveDefault: false }),
  mk({ sourceRef: "r1", kind: "regulatory", name: "DL 54/2018" }),
  mk({
    sourceRef: "o1", kind: "organization", type: "regra", name: "Regras de avaliação", status: "embedding",
    subjects: ["MATEMATICA"], schoolYears: [7, 8], organizationId: "A", organizationName: "Agrupamento A",
    uploadedByName: "Ana", summary: "Resumo da regra",
  }),
];

/** The AE-off note, found by its text rather than by role. */
const noteOf = (c: HTMLElement, text: string) => [...c.querySelectorAll("p")].find((el) => el.textContent === text) ?? null;

describe.each([["pt-PT", pt], ["en", en]] as const)("DefaultSourcesSections %s", (locale, messages) => {
  it("renders every section with a named switch, the AE-off note and no raw keys", () => {
    const { container: c } = render(locale, messages as typeof pt, entries);
    const p = messages.sources.page;
    const headings = [...c.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings).toEqual([p.curriculum, p.regulatory, p.fromSchool.replace("{name}", "Agrupamento A")]);
    const labels = [...c.querySelectorAll('[role="switch"]')].map((s) => s.getAttribute("aria-label"));
    expect(labels).toEqual(entries.map((e) => `${p.useByDefault}: ${e.name}`));
    expect(noteOf(c, p.aeOffNote)).not.toBeNull();
    expect(c.textContent).toContain(messages.sources.status.embedding); // not indexed: status shown, switch kept
    expect(c.textContent).not.toMatch(/sources\.(page|status)|schoolSources\./);
    expect(c.querySelector("a[download]")).toBeNull();
  });

  it("hides the AE note while AE is on", () => {
    const { container: c } = render(locale, messages as typeof pt, [mk({ sourceRef: "ae", kind: "ae", name: "AE" })]);
    expect(noteOf(c, messages.sources.page.aeOffNote)).toBeNull();
  });

  it("shows placeholder rows while the defaults load, not an empty section", () => {
    const { container: c } = render(locale, messages as typeof pt, [], "loading");
    expect(c.querySelector('[aria-hidden="true"], [aria-hidden=""]')).not.toBeNull();
    expect(c.querySelector('[role="switch"]')).toBeNull();
  });

  it("clamps very long names and many tags, keeping the full text in the title", () => {
    const tagged = mk({
      sourceRef: "o9", kind: "organization", type: "apoio", name: LONG_NAME, organizationId: "A", organizationName: LONG_NAME,
      subjects: MAX_SUBJECTS, schoolYears: ALL_YEARS, uploadedByName: LONG_NAME,
    });
    const { container: c } = render(locale, messages as typeof pt, [
      mk({ sourceRef: "r9", kind: "regulatory", name: LONG_NAME }),
      tagged,
    ]);
    const named = [...c.querySelectorAll<HTMLElement>(`[title="${LONG_NAME}"]`)];
    expect(named).toHaveLength(2);
    expect(named.every((el) => /line-clamp-2|truncate/.test(el.className))).toBe(true);
    const meta = [...c.querySelectorAll<HTMLElement>("p[title]")].find((el) => el.title.includes(" · "));
    expect(meta?.title).toContain(LONG_NAME); // "Adicionada por <name>" is in it
    expect(meta?.className).toContain("line-clamp-2");
    expect(c.querySelectorAll('[role="switch"]')).toHaveLength(2); // the switch stays, whatever the text
  });

  it("toasts when a toggle fails and the switch goes back", async () => {
    vi.mocked(setSourceDefault).mockRejectedValueOnce(new Error("boom"));
    const { container: c } = render(locale, messages as typeof pt, [mk({ sourceRef: "ae", kind: "ae", name: "AE" })]);
    const sw = c.querySelector('[role="switch"]') as HTMLElement;
    await act(async () => sw.click());
    expect(toast.error).toHaveBeenLastCalledWith(messages.sources.page.saveError);
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("shows the server message of a 4xx", async () => {
    vi.mocked(setSourceDefault).mockRejectedValueOnce(new ApiRequestError("Sem acesso", 403, null));
    const { container: c } = render(locale, messages as typeof pt, [mk({ sourceRef: "ae", kind: "ae", name: "AE" })]);
    await act(async () => (c.querySelector('[role="switch"]') as HTMLElement).click());
    expect(toast.error).toHaveBeenLastCalledWith("Sem acesso");
  });

  it("shows an error with a retry when the defaults failed to load", async () => {
    vi.mocked(listSourceDefaults).mockClear();
    vi.mocked(listSourceDefaults).mockResolvedValue([]);
    const { container: c } = render(locale, messages as typeof pt, [], "failed");
    expect(c.querySelector('[role="switch"]')).toBeNull();
    await act(async () => (c.querySelector("button") as HTMLElement).click());
    expect(listSourceDefaults).toHaveBeenCalledTimes(1);
  });
});
