import type { SourceDefault } from "@/shared/types/sources";
import { describe, expect, it } from "vitest";
import { groupSourceDefaults } from "./groupSourceDefaults";

const base: SourceDefault = {
  sourceRef: "", kind: "personal", type: null, name: "", effectiveDefault: true, startingState: true,
  status: "indexed", subjects: [], schoolYears: [], organizationId: null, organizationName: null,
  uploadedByName: null, summary: null, externalUrl: null, chunkCount: 0,
};
const mk = (o: Partial<SourceDefault>): SourceDefault => ({ ...base, ...o });
const ae = mk({ sourceRef: "ae", kind: "ae", name: "AE" });
const reg1 = mk({ sourceRef: "r1", kind: "regulatory", name: "DL 54/2018" });
const schoolA1 = mk({ sourceRef: "a1", kind: "organization", organizationId: "A", organizationName: "Agrupamento A" });
const schoolA2 = mk({ sourceRef: "a2", kind: "organization", organizationId: "A", organizationName: "Agrupamento A" });
const schoolB1 = mk({ sourceRef: "b1", kind: "organization", organizationId: "B", organizationName: "Agrupamento B" });
const mine = mk({ sourceRef: "p1", kind: "personal" });

describe("groupSourceDefaults", () => {
  it("groups defaults by section and school", () => {
    const g = groupSourceDefaults([ae, reg1, schoolB1, schoolA1, schoolA2, mine]);
    expect(g.curriculum).toEqual([ae]);
    expect(g.regulatory).toEqual([reg1]);
    expect(g.schools.map((s) => s.organizationName)).toEqual(["Agrupamento A", "Agrupamento B"]);
    expect(g.schools[0].entries).toEqual([schoolA1, schoolA2]);
    expect(g.personalByRef[mine.sourceRef]).toBe(mine);
  });

  it("shows only what the server returned (free user without schools or v2)", () => {
    const g = groupSourceDefaults([ae]);
    expect(g.regulatory).toEqual([]);
    expect(g.schools).toEqual([]);
    expect(g.personalByRef).toEqual({});
  });
});
