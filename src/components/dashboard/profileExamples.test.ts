import { describe, expect, it } from "vitest";
import type { TeachingProfile } from "@/shared/types/teaching-profile";
import { currentTopic, profileExamplePairs } from "@/components/dashboard/profileExamples";

const subject = (code: string) => ({
  qualificationCode: null,
  kind: "subject" as const,
  code,
  label: code,
  trainingComponent: null,
});
const profile = (schoolYears: number[], codes: string[], extra: TeachingProfile["items"] = []): TeachingProfile => ({
  educationType: "regular",
  courses: [],
  courseStates: [],
  schoolYears,
  items: [...codes.map(subject), ...extra],
});

describe("profileExamplePairs", () => {
  it("uses each year the teacher's subject is taught in", () => {
    expect(profileExamplePairs(profile([5, 6], ["matematica"]))).toEqual([
      { subjectId: "matematica", year: 5 },
      { subjectId: "matematica", year: 6 },
    ]);
  });

  it("spreads three examples across subjects before repeating one", () => {
    expect(profileExamplePairs(profile([3, 4], ["portugues", "matematica", "estudo_meio"]))).toEqual([
      { subjectId: "portugues", year: 3 },
      { subjectId: "matematica", year: 3 },
      { subjectId: "estudo_meio", year: 3 },
    ]);
  });

  it("skips years a subject isn't taught in, and vocational units", () => {
    const unit = { qualificationCode: "Q1", kind: "unit" as const, code: "u1", label: "UC", trainingComponent: null };
    expect(profileExamplePairs(profile([1, 5], ["matematica", "hgp"], [unit]))).toEqual([
      { subjectId: "matematica", year: 1 },
      { subjectId: "hgp", year: 5 },
      { subjectId: "matematica", year: 5 },
    ]);
  });

  it("is empty without years or subjects", () => {
    expect(profileExamplePairs(profile([], ["matematica"]))).toEqual([]);
    expect(profileExamplePairs(profile([5], []))).toEqual([]);
    expect(profileExamplePairs(null)).toEqual([]);
  });
});

describe("currentTopic", () => {
  const topics = Array.from({ length: 11 }, (_, i) => `T${i + 1}`);
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

  it("is the topic that comes after what's usually taught by the date", () => {
    expect(currentTopic(topics, day(2026, 11, 5))).toBe("T2");
    expect(currentTopic(topics, day(2026, 9, 10))).toBe("T1");
  });

  it("stays on the last topic at the end of the year, and is null without topics", () => {
    expect(currentTopic(topics, day(2027, 6, 30))).toBe("T11");
    expect(currentTopic([], day(2026, 11, 5))).toBeNull();
  });
});
