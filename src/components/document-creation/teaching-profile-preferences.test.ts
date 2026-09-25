import { describe, expect, it } from "vitest";
import type { TeachingProfile } from "@/shared/types/teaching-profile";
import {
  buildRegularTeachingItems,
  findVocationalSchoolSubjectCode,
  findVocationalUnitCode,
  getDefaultSchoolYear,
  getPreferredRegularSubjectIds,
  getPreferredSchoolYears,
  getVocationalCourseOptions,
  getTeachingProfileSuggestions,
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

describe("getVocationalCourseOptions", () => {
  it("groups saved vocational items by selected course, ignoring unselected courses", () => {
    const result = getVocationalCourseOptions(
      profile({
        educationType: "vocational",
        courses: ["COURSE-A"],
        courseStates: [
          { code: "COURSE-A", title: "Técnico de Informática", ingestionStatus: "indexed" },
        ],
        items: [
          { qualificationCode: "COURSE-A", kind: "unit", code: "UC01", label: "Programação Web", trainingComponent: "technological" },
          { qualificationCode: "COURSE-A", kind: "subject", code: "S1", label: "Comunicação", trainingComponent: "sociocultural" },
          { qualificationCode: "COURSE-B", kind: "unit", code: "UC99", label: "Curso removido", trainingComponent: "technological" },
        ],
      })
    );

    expect(result).toEqual([
      {
        code: "COURSE-A",
        title: "Técnico de Informática",
        units: [
          { code: "UC01", label: "Programação Web" },
          { code: "S1", label: "Comunicação" },
        ],
      },
    ]);
  });

  it("returns an empty list for a profile with no vocational selections", () => {
    expect(getVocationalCourseOptions(profile())).toEqual([]);
  });

  it("returns an empty list for a null profile", () => {
    expect(getVocationalCourseOptions(null)).toEqual([]);
  });
});

describe("getTeachingProfileSuggestions", () => {
  it("uses regular catalogue labels and excludes invalid stale items", () => {
    expect(
      getTeachingProfileSuggestions(
        profile({
          items: [
            { qualificationCode: null, kind: "subject", code: "matematica", label: "Wrong stale label", trainingComponent: null },
            { qualificationCode: "course", kind: "unit", code: "u1", label: "Stale unit", trainingComponent: "technological" },
          ],
        })
      )
    ).toEqual([
      {
        key: "regular:matematica",
        label: "Mathematics",
        regularSubjectId: "matematica",
      },
    ]);
  });

  it("returns unique regular and vocational labels together", () => {
    expect(
      getTeachingProfileSuggestions(
        profile({
          educationType: "vocational",
          courses: ["course"],
          items: [
            { qualificationCode: null, kind: "subject", code: "matematica", label: "Mathematics", trainingComponent: null },
            { qualificationCode: "course", kind: "subject", code: "s1", label: "Communication", trainingComponent: "sociocultural" },
            { qualificationCode: "course", kind: "unit", code: "u1", label: "Web Development", trainingComponent: "technological" },
            { qualificationCode: "course", kind: "unit", code: "u2", label: "Web Development", trainingComponent: "technological" },
            { qualificationCode: null, kind: "subject", code: "ingles", label: "Stale regular", trainingComponent: null },
          ],
        })
      )
    ).toEqual([
      { key: "regular:matematica", label: "Mathematics", regularSubjectId: "matematica" },
      { key: "course:subject:s1", label: "Communication" },
      { key: "course:unit:u1", label: "Web Development" },
      { key: "regular:ingles", label: "English", regularSubjectId: "ingles" },
    ]);
  });
});

describe("findVocationalUnitCode", () => {
  const units = [
    { code: "UC01", label: "Programação Web" },
    { code: "UC02", label: "Desenvolver algoritmos" },
  ];

  it("returns the code of the unit matching the given label", () => {
    expect(findVocationalUnitCode(units, "Desenvolver algoritmos")).toBe("UC02");
  });

  it("returns undefined when no unit matches the label", () => {
    expect(findVocationalUnitCode(units, "Unknown unit")).toBeUndefined();
  });

  it("returns undefined for an empty units list", () => {
    expect(findVocationalUnitCode([], "Desenvolver algoritmos")).toBeUndefined();
  });
});

describe("findVocationalSchoolSubjectCode", () => {
  const subjects = [
    { subjectCode: "ECO10", subjectName: "Economia" },
    { subjectCode: "PSI11", subjectName: "Psicologia e Sociologia" },
  ];

  it("returns the code of the subject matching the given name", () => {
    expect(findVocationalSchoolSubjectCode(subjects, "Psicologia e Sociologia")).toBe("PSI11");
  });

  it("returns undefined when no subject matches the name", () => {
    expect(findVocationalSchoolSubjectCode(subjects, "Unknown subject")).toBeUndefined();
  });

  it("returns undefined for an empty subjects list", () => {
    expect(findVocationalSchoolSubjectCode([], "Economia")).toBeUndefined();
  });
});
