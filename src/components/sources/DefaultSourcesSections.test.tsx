// @vitest-environment jsdom
import { configureStore } from "@reduxjs/toolkit";
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import pt from "../../../messages/pt-PT.json";
import type { SourceDefault } from "@/shared/types/sources";
import sourceDefaults from "@/store/sources/sourceDefaultsSlice";
import { DefaultSourcesSections } from "./DefaultSourcesSections";

vi.mock("@/services/api/sources.service", () => ({ listSourceDefaults: vi.fn(), setSourceDefault: vi.fn() }));

const mk = (o: Partial<SourceDefault>): SourceDefault => ({
  sourceRef: "", kind: "personal", type: null, name: "", effectiveDefault: true, startingState: true,
  status: "indexed", subjects: [], schoolYears: [], organizationId: null, organizationName: null,
  uploadedByName: null, summary: null, externalUrl: null, chunkCount: 0, ...o,
});

function render(locale: "pt-PT" | "en", messages: typeof pt, entries: SourceDefault[]) {
  const store = configureStore({
    reducer: { sourceDefaults },
    preloadedState: { sourceDefaults: { entries, status: "loaded" as const } },
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
  return container;
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

describe.each([["pt-PT", pt], ["en", en]] as const)("DefaultSourcesSections %s", (locale, messages) => {
  it("renders every section with a named switch, the AE-off note and no raw keys", () => {
    const c = render(locale, messages as typeof pt, entries);
    const p = messages.sources.page;
    const headings = [...c.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings).toEqual([p.curriculum, p.regulatory, p.fromSchool.replace("{name}", "Agrupamento A")]);
    const labels = [...c.querySelectorAll('[role="switch"]')].map((s) => s.getAttribute("aria-label"));
    expect(labels).toEqual(entries.map((e) => `${p.useByDefault}: ${e.name}`));
    expect(c.querySelector('[role="status"]')?.textContent).toBe(p.aeOffNote);
    expect(c.textContent).toContain(messages.sources.status.embedding); // not indexed: status shown, switch kept
    expect(c.textContent).not.toMatch(/sources\.(page|status)|schoolSources\./);
    expect(c.querySelector("a[download]")).toBeNull();
  });

  it("hides the AE note while AE is on", () => {
    const c = render(locale, messages as typeof pt, [mk({ sourceRef: "ae", kind: "ae", name: "AE" })]);
    expect(c.querySelector('[role="status"]')).toBeNull();
  });
});
