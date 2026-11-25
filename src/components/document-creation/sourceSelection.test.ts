import { describe, expect, it } from "vitest";
import type { SourceDefault } from "@/shared/types/sources";
import { defaultSourceIds, orderSchoolSources, reconcileSchoolIds } from "./sourceSelection";

const src = (over: Partial<SourceDefault>): SourceDefault => ({
  sourceRef: "x", kind: "organization", type: "regra", name: "n", effectiveDefault: true, startingState: true,
  status: "indexed", subjects: [], schoolYears: [], organizationId: "org", organizationName: "Escola",
  uploadedByName: null, summary: null, externalUrl: null, chunkCount: 1, ...over,
});
const mathRule = src({ sourceRef: "o1", subjects: ["Mathematics"], schoolYears: [7, 8, 9] });
const untagged = src({ sourceRef: "o2" });
const portBank = src({ sourceRef: "o3", type: "apoio", subjects: ["Portuguese"], schoolYears: [5, 6] });
const personal = src({ sourceRef: "p1", kind: "personal", type: null, organizationId: null });

describe("orderSchoolSources", () => {
  it("lists school sources that match the form first", () => {
    const r = orderSchoolSources([mathRule, untagged, portBank], "Mathematics", 7);
    expect(r.matching).toEqual([mathRule, untagged]);
    expect(r.others).toEqual([portBank]);
  });
  it("without subject or year only untagged school sources match", () => {
    expect(orderSchoolSources([mathRule, untagged], undefined, undefined).matching).toEqual([untagged]);
  });
  it("ignores personal and not indexed sources", () => {
    const r = orderSchoolSources([personal, src({ sourceRef: "o4", status: "parsing" })], "Mathematics", 7);
    expect(r).toEqual({ matching: [], others: [] });
  });
});

describe("defaultSourceIds", () => {
  it("ticks enabled personal sources and enabled matching school sources only", () => {
    const off = src({ sourceRef: "o5", effectiveDefault: false });
    expect(defaultSourceIds([personal, mathRule, portBank, off], "Mathematics", 7)).toEqual(["p1", "o1"]);
  });
});

describe("reconcileSchoolIds", () => {
  const entries = [mathRule, portBank];
  it("re-evaluates untouched rows when subject or year change", () => {
    expect(reconcileSchoolIds(["o1", "p1"], entries, "Portuguese", 5, new Set())).toEqual(["p1", "o3"]);
  });
  it("keeps the teacher's choice on a touched row", () => {
    expect(reconcileSchoolIds(["o1"], entries, "Portuguese", 5, new Set(["o1", "o3"]))).toEqual(["o1"]);
  });
});
