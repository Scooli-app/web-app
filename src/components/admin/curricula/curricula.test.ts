import { describe, expect, it } from "vitest";
import type { CurriculaOverview } from "@/services/api/admin-curricula.service";
import { groupByCountry, isProblemRun, runOutcomeLabel, summarize, versionStateLabel } from "./curricula";

const version = (items: number, loadedAt: string | null = null) => ({
  label: "2018",
  state: "validated",
  validFrom: "2018-12-14",
  loadedAt,
  items,
  license: null,
});

const overview: CurriculaOverview = {
  jurisdictions: [
    { code: "BR", name: "Brasil", kind: "country", parentCode: null },
    { code: "BR-MT", name: "Mato Grosso", kind: "state", parentCode: "BR" },
    { code: "BR-MS", name: "Mato Grosso do Sul", kind: "state", parentCode: "BR" },
    { code: "PT", name: "Portugal", kind: "country", parentCode: null },
  ],
  frameworks: [
    { key: "br-mt.drc", title: "DRC-MT", status: null, authority: null, jurisdictions: ["BR-MT"], versions: [version(1496, "2026-11-23T20:43:00Z")] },
    { key: "br.bncc", title: "BNCC", status: null, authority: null, jurisdictions: ["BR"], versions: [version(2360, "2026-11-23T10:17:00Z")] },
    { key: "br-ms.curriculo", title: "Currículo MS", status: null, authority: null, jurisdictions: ["BR-MS"], versions: [version(1789, "2026-11-23T20:49:00Z")] },
    { key: "pt.ae", title: "AE", status: null, authority: null, jurisdictions: ["PT"], versions: [] },
  ],
  runs: [],
};

describe("groupByCountry", () => {
  it("puts states under their country, the national curriculum first", () => {
    const groups = groupByCountry(overview);

    expect(groups.map((g) => g.code)).toEqual(["BR", "PT"]);
    const brazil = groups[0];
    expect(brazil.places.map((p) => p.code)).toEqual(["BR", "BR-MT", "BR-MS"]);
    expect(brazil.places[0].national).toBe(true);
    expect(brazil.places[1].items).toBe(1496);
    expect(brazil.totalItems).toBe(2360 + 1496 + 1789);
  });

  it("counts a framework with no version as zero items", () => {
    expect(groupByCountry(overview)[1].totalItems).toBe(0);
  });
});

describe("summarize", () => {
  it("counts countries, states, frameworks and items, and finds the last load", () => {
    const summary = summarize(overview, groupByCountry(overview));
    expect(summary).toEqual({
      countries: 2,
      states: 2,
      frameworks: 4,
      items: 2360 + 1496 + 1789,
      lastLoadedAt: "2026-11-23T20:49:00Z",
    });
  });
});

describe("labels", () => {
  it("translates version states and run outcomes", () => {
    expect(versionStateLabel("validated")).toEqual({ label: "Validado", tone: "info" });
    expect(versionStateLabel("published").label).toBe("Publicado");
    expect(runOutcomeLabel("loaded")).toEqual({ label: "Carregado", tone: "success" });
    expect(runOutcomeLabel("unchanged").label).toBe("Sem alterações");
  });

  it("flags failed and rejected runs only", () => {
    expect(isProblemRun("failed")).toBe(true);
    expect(isProblemRun("rejected")).toBe(true);
    expect(isProblemRun("loaded")).toBe(false);
    expect(isProblemRun("unchanged")).toBe(false);
  });
});
