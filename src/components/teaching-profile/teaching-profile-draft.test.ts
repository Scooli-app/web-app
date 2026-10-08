import { describe, expect, it } from "vitest";
import type { TeachingItem, TeachingProfile } from "@/shared/types/teaching-profile";
import {
  buildProfileForSave,
  deriveTeachingScope,
  mergeVocationalSelection,
  modeToScope,
  profileFingerprint,
  schoolYearsForScope,
  scopeToMode,
  setUnitItems,
  toggleUnitItem,
} from "./teaching-profile-draft";

const profile = (overrides: Partial<TeachingProfile> = {}): TeachingProfile => ({
  educationType: "regular",
  courses: [],
  courseStates: [],
  schoolYears: [],
  items: [],
  ...overrides,
});

const regularItem = (code: string, label: string): TeachingItem => ({
  qualificationCode: null,
  kind: "subject",
  code,
  label,
  trainingComponent: null,
});

const unitItem = (courseCode: string, code: string): TeachingItem => ({
  qualificationCode: courseCode,
  kind: "unit",
  code,
  label: `UC ${code}`,
  trainingComponent: "technological",
});

describe("deriveTeachingScope", () => {
  it("defaults an empty profile to regular only", () => {
    expect(deriveTeachingScope(profile())).toEqual({ regular: true, vocational: false });
  });

  it("recognises a vocational-only profile", () => {
    expect(
      deriveTeachingScope(profile({ educationType: "vocational", courses: ["C1"], schoolYears: [10, 11] }))
    ).toEqual({ regular: false, vocational: true });
  });

  it("recognises teachers who teach both, whatever educationType says", () => {
    expect(
      deriveTeachingScope(
        profile({ educationType: "regular", courses: ["C1"], items: [regularItem("ingles", "English")] })
      )
    ).toEqual({ regular: true, vocational: true });
  });

  it("treats basic-education years as regular teaching", () => {
    expect(
      deriveTeachingScope(profile({ educationType: "vocational", courses: ["C1"], schoolYears: [7, 10] }))
    ).toEqual({ regular: true, vocational: true });
  });
});

describe("schoolYearsForScope", () => {
  it("offers every year for regular teaching", () => {
    expect(schoolYearsForScope({ regular: true, vocational: true })).toHaveLength(12);
  });

  it("offers only 10.º–12.º for vocational-only teaching", () => {
    expect(schoolYearsForScope({ regular: false, vocational: true })).toEqual([10, 11, 12]);
  });

  it("offers nothing when neither is selected", () => {
    expect(schoolYearsForScope({ regular: false, vocational: false })).toEqual([]);
  });
});

describe("buildProfileForSave", () => {
  const both = profile({
    educationType: "regular",
    courses: ["C1"],
    courseStates: [{ code: "C1", title: "Curso 1", ingestionStatus: "indexed" }],
    schoolYears: [12, 7, 10],
    items: [regularItem("ingles", "English"), unitItem("C1", "U1"), unitItem("C2", "U9")],
  });

  it("keeps both kinds and marks the profile vocational when there are courses", () => {
    const saved = buildProfileForSave(both, { regular: true, vocational: true });
    expect(saved.educationType).toBe("vocational");
    expect(saved.courses).toEqual(["C1"]);
    expect(saved.schoolYears).toEqual([7, 10, 12]);
    // Items of courses no longer selected are dropped.
    expect(saved.items.map((item) => item.code)).toEqual(["ingles", "U1"]);
  });

  it("drops everything vocational when that scope is switched off", () => {
    const saved = buildProfileForSave(both, { regular: true, vocational: false });
    expect(saved.educationType).toBe("regular");
    expect(saved.courses).toEqual([]);
    expect(saved.courseStates).toEqual([]);
    expect(saved.items.map((item) => item.code)).toEqual(["ingles"]);
  });

  it("drops regular subjects and basic-education years when regular is switched off", () => {
    const saved = buildProfileForSave(both, { regular: false, vocational: true });
    expect(saved.educationType).toBe("vocational");
    expect(saved.schoolYears).toEqual([10, 12]);
    expect(saved.items.map((item) => item.code)).toEqual(["U1"]);
  });

  it("normalises regular subjects to the catalogue contract", () => {
    const saved = buildProfileForSave(
      profile({ items: [regularItem("matematica", "stale label"), regularItem("unknown", "x")] }),
      { regular: true, vocational: false }
    );
    expect(saved.items).toEqual([regularItem("matematica", "Mathematics")]);
  });

  it("keeps a vocational-only profile without courses vocational", () => {
    expect(buildProfileForSave(profile(), { regular: false, vocational: true }).educationType).toBe(
      "vocational"
    );
  });
});

describe("profileFingerprint", () => {
  it("ignores ordering", () => {
    const a = profile({ courses: ["C1", "C2"], schoolYears: [10, 11], items: [unitItem("C1", "U1"), unitItem("C2", "U2")] });
    const b = profile({ courses: ["C2", "C1"], schoolYears: [11, 10], items: [unitItem("C2", "U2"), unitItem("C1", "U1")] });
    expect(profileFingerprint(a)).toBe(profileFingerprint(b));
  });

  it("changes when a selection changes", () => {
    expect(profileFingerprint(profile({ schoolYears: [10] }))).not.toBe(
      profileFingerprint(profile({ schoolYears: [11] }))
    );
  });
});

describe("toggleUnitItem / setUnitItems", () => {
  const unit = (code: string) => ({ code, title: `UC ${code}`, position: null });

  it("adds a UC as a technological unit item, and removes it on the second toggle", () => {
    const added = toggleUnitItem([regularItem("ingles", "English")], "C1", unit("U1"));
    expect(added).toEqual([regularItem("ingles", "English"), unitItem("C1", "U1")]);
    expect(toggleUnitItem(added, "C1", unit("U1"))).toEqual([regularItem("ingles", "English")]);
  });

  it("only touches the given course", () => {
    expect(toggleUnitItem([unitItem("C2", "U1")], "C1", unit("U1"))).toEqual([
      unitItem("C2", "U1"),
      unitItem("C1", "U1"),
    ]);
  });

  it("selects and clears a batch without duplicating", () => {
    const all = setUnitItems([unitItem("C1", "U1")], "C1", [unit("U1"), unit("U2")], true);
    expect(all.map((item) => item.code)).toEqual(["U1", "U2"]);
    expect(setUnitItems(all, "C1", [unit("U1"), unit("U2")], false)).toEqual([]);
  });
});

describe("mergeVocationalSelection", () => {
  it("turns an empty profile into a vocational one with the picked UCs", () => {
    const merged = mergeVocationalSelection(profile(), ["C1"], [unitItem("C1", "U1")]);
    expect(merged.educationType).toBe("vocational");
    expect(merged.courses).toEqual(["C1"]);
    expect(merged.items).toEqual([unitItem("C1", "U1")]);
  });

  it("keeps the teacher's regular subjects, years and other courses", () => {
    const existing = profile({
      courses: ["C2"],
      schoolYears: [7, 10],
      items: [regularItem("matematica", "Mathematics"), unitItem("C2", "U9")],
    });
    const merged = mergeVocationalSelection(existing, ["C1"], [unitItem("C1", "U1")]);
    expect(merged.courses).toEqual(["C2", "C1"]);
    expect(merged.schoolYears).toEqual([7, 10]);
    expect(merged.items.map((item) => item.code)).toEqual(["matematica", "U9", "U1"]);
  });

  it("replaces the UCs of a course the teacher already had", () => {
    const existing = profile({ courses: ["C1"], items: [unitItem("C1", "U1"), unitItem("C1", "U2")] });
    const merged = mergeVocationalSelection(existing, ["C1"], [unitItem("C1", "U3")]);
    expect(merged.courses).toEqual(["C1"]);
    expect(merged.items.map((item) => item.code)).toEqual(["U3"]);
  });
});

describe("scopeToMode / modeToScope", () => {
  it("maps regular-only scope to the regular mode", () => {
    expect(scopeToMode({ regular: true, vocational: false })).toBe("regular");
    expect(modeToScope("regular")).toEqual({ regular: true, vocational: false });
  });

  it("maps vocational-only scope to the vocational mode", () => {
    expect(scopeToMode({ regular: false, vocational: true })).toBe("vocational");
    expect(modeToScope("vocational")).toEqual({ regular: false, vocational: true });
  });

  it("maps a scope with both enabled to the both mode", () => {
    expect(scopeToMode({ regular: true, vocational: true })).toBe("both");
    expect(modeToScope("both")).toEqual({ regular: true, vocational: true });
  });

  it("round-trips every mode through scope and back", () => {
    (["regular", "vocational", "both"] as const).forEach((mode) => {
      expect(scopeToMode(modeToScope(mode))).toBe(mode);
    });
  });
});
