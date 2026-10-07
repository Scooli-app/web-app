import { describe, expect, it } from "vitest";
import type { TeachingProfile } from "@/shared/types/teaching-profile";
import {
  buildRegularTeachingItems,
  getDefaultSchoolYear,
  getDefaultTeachingMode,
  getDefaultVocationalSchoolYear,
  getPreferredRegularSubjectIds,
  getPreferredSchoolYears,
  getVocationalCourseOptions,
} from "./teaching-profile-preferences";

const profile = (overrides: Partial<TeachingProfile> = {}): TeachingProfile => ({
  educationType: "regular",
  courses: [],
  courseStates: [],
  schoolYears: [],
  items: [],
  ...overrides,
});

describe("buildRegularTeachingItems", () => {
  it("maps selected catalogue IDs to the backend subject contract", () => {
    expect(buildRegularTeachingItems(["matematica", "ingles"])).toEqual([
      {
        qualificationCode: null,
        kind: "subject",
        code: "matematica",
        label: "Mathematics",
        trainingComponent: null,
      },
      {
        qualificationCode: null,
        kind: "subject",
        code: "ingles",
        label: "English",
        trainingComponent: null,
      },
    ]);
  });

  it("drops unknown and duplicate subject IDs", () => {
    expect(buildRegularTeachingItems(["unknown", "ingles", "ingles"])).toHaveLength(1);
  });
});

describe("getPreferredRegularSubjectIds", () => {
  it("returns only valid profile subjects available for the selected grade", () => {
    const result = getPreferredRegularSubjectIds(
      profile({
        items: [
          { qualificationCode: null, kind: "subject", code: "ingles", label: "English", trainingComponent: null },
          { qualificationCode: null, kind: "subject", code: "matematica_a", label: "Mathematics A", trainingComponent: null },
          { qualificationCode: "course", kind: "subject", code: "matematica", label: "Mathematics", trainingComponent: null },
          { qualificationCode: null, kind: "subject", code: "missing", label: "Missing", trainingComponent: null },
        ],
      }),
      ["matematica", "ingles"]
    );

    expect(result).toEqual(["ingles"]);
  });

  it("keeps regular subjects available alongside vocational selections", () => {
    expect(
      getPreferredRegularSubjectIds(
        profile({
          educationType: "vocational",
          items: [{ qualificationCode: null, kind: "subject", code: "ingles", label: "English", trainingComponent: null }],
        }),
        ["ingles"]
      )
    ).toEqual(["ingles"]);
  });
});

describe("getPreferredSchoolYears", () => {
  it("returns valid saved years in creation-form order", () => {
    expect(getPreferredSchoolYears(profile({ schoolYears: [0, 5, 3, 13] }), [1, 2, 3, 4, 5])).toEqual([3, 5]);
  });
});

describe("getDefaultSchoolYear", () => {
  it("returns the lowest preferred year", () => {
    expect(getDefaultSchoolYear([7, 3, 5])).toBe(3);
  });

  it("returns null when there are no preferred years", () => {
    expect(getDefaultSchoolYear([])).toBeNull();
  });
});

describe("getDefaultVocationalSchoolYear", () => {
  it("returns the lowest saved secondary year", () => {
    expect(getDefaultVocationalSchoolYear([7, 12, 11])).toBe(11);
  });

  it("falls back to the course's first year when no secondary year is saved", () => {
    expect(getDefaultVocationalSchoolYear([5, 7])).toBe(10);
    expect(getDefaultVocationalSchoolYear([])).toBe(10);
  });
});

describe("getVocationalCourseOptions", () => {
  it("lists each saved course with its picked UCs, ignoring unselected courses", () => {
    const result = getVocationalCourseOptions(
      profile({
        educationType: "vocational",
        courses: ["COURSE-A"],
        courseStates: [
          { code: "COURSE-A", title: "Técnico de Informática", ingestionStatus: "indexed" },
        ],
        items: [
          { qualificationCode: "COURSE-A", kind: "unit", code: "UC01", label: "Programação Web", trainingComponent: "technological" },
          { qualificationCode: "COURSE-A", kind: "subject", code: "S1", label: "Português", trainingComponent: "sociocultural" },
          { qualificationCode: "COURSE-A", kind: "subject", code: "S2", label: "Matemática", trainingComponent: "scientific" },
          { qualificationCode: "COURSE-B", kind: "unit", code: "UC99", label: "Curso removido", trainingComponent: "technological" },
        ],
      })
    );

    expect(result).toEqual([
      {
        code: "COURSE-A",
        title: "Técnico de Informática",
        units: [{ code: "UC01", label: "Programação Web" }],
        classes: [],
      },
    ]);
  });

  it("keeps a saved course with no UC picked, so its full catalogue stays reachable", () => {
    expect(
      getVocationalCourseOptions(
        profile({ educationType: "vocational", courses: ["COURSE-A"], courseStates: [] })
      )
    ).toEqual([{ code: "COURSE-A", title: "COURSE-A", units: [], classes: [] }]);
  });

  it("returns an empty list for a profile with no vocational selections", () => {
    expect(getVocationalCourseOptions(profile())).toEqual([]);
  });

  it("returns an empty list for a null profile", () => {
    expect(getVocationalCourseOptions(null)).toEqual([]);
  });
});

describe("getDefaultTeachingMode", () => {
  it("starts vocational-only teachers in vocational mode", () => {
    expect(
      getDefaultTeachingMode(profile({ courses: ["COURSE-A"], schoolYears: [10, 11] }))
    ).toBe("vocational");
  });

  it("stays regular for teachers who also teach regular subjects", () => {
    expect(
      getDefaultTeachingMode(
        profile({
          courses: ["COURSE-A"],
          items: [{ qualificationCode: null, kind: "subject", code: "ingles", label: "English", trainingComponent: null }],
        })
      )
    ).toBe("regular");
  });

  it("stays regular for teachers with basic-education years", () => {
    expect(getDefaultTeachingMode(profile({ courses: ["COURSE-A"], schoolYears: [9, 10] }))).toBe(
      "regular"
    );
  });

  it("stays regular without courses or a profile", () => {
    expect(getDefaultTeachingMode(profile({ educationType: "vocational" }))).toBe("regular");
    expect(getDefaultTeachingMode(null)).toBe("regular");
  });
});
