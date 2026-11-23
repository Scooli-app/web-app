import { describe, expect, it } from "vitest";
import type { CurriculaOverview } from "@/services/api/admin-curricula.service";
import { groupByCountry, isProblemRun } from "./curricula";

const version = (items: number) => ({
  label: "2018",
  state: "validated",
  validFrom: "2018-12-14",
  loadedAt: null,
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
    { key: "br-mt.drc", title: "DRC-MT", status: null, authority: null, jurisdictions: ["BR-MT"], versions: [version(1496)] },
    { key: "br.bncc", title: "BNCC", status: null, authority: null, jurisdictions: ["BR"], versions: [version(2360)] },
    { key: "br-ms.curriculo", title: "Currículo MS", status: null, authority: null, jurisdictions: ["BR-MS"], versions: [version(1789)] },
    { key: "pt.ae", title: "AE", status: null, authority: null, jurisdictions: ["PT"], versions: [] },
  ],
  runs: [],
};

describe("groupByCountry", () => {
  it("puts states under their country, the country first", () => {
    const groups = groupByCountry(overview);

    expect(groups.map((g) => g.code)).toEqual(["BR", "PT"]);
    const brazil = groups[0];
    expect(brazil.places.map((p) => p.code)).toEqual(["BR", "BR-MS", "BR-MT"]);
    expect(brazil.places[2].name).toBe("Mato Grosso");
    expect(brazil.totalItems).toBe(2360 + 1496 + 1789);
  });

  it("counts a framework with no version as zero items", () => {
    expect(groupByCountry(overview)[1].totalItems).toBe(0);
  });
});

describe("isProblemRun", () => {
  it("flags failed and rejected runs only", () => {
    expect(isProblemRun("failed")).toBe(true);
    expect(isProblemRun("rejected")).toBe(true);
    expect(isProblemRun("loaded")).toBe(false);
    expect(isProblemRun("unchanged")).toBe(false);
  });
});
