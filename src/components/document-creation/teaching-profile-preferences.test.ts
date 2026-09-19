import { describe, expect, it } from "vitest";
import type { TeachingProfile } from "@/shared/types/teaching-profile";
import {
  buildRegularTeachingItems,
  getPreferredRegularSubjectIds,
  getPreferredSchoolYears,
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
