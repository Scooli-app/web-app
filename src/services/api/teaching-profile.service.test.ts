import { describe, expect, it, vi } from "vitest";
import type { TeachingProfile } from "@/shared/types/teaching-profile";

const put = vi.fn();
const get = vi.fn();

vi.mock("./client", () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    put: (...args: unknown[]) => put(...args),
  },
}));

const { teachingProfileService } = await import("./teaching-profile.service");

const profile = (overrides: Partial<TeachingProfile> = {}): TeachingProfile => ({
  educationType: "regular",
  courses: [],
  courseStates: [],
  schoolYears: [],
  items: [],
  ...overrides,
});

describe("teachingProfileService.save", () => {
  it("sends schoolYears in the PUT payload", async () => {
    put.mockResolvedValue({ data: profile({ schoolYears: [5, 6] }) });

    await teachingProfileService.save(profile({ schoolYears: [5, 6] }));

    expect(put).toHaveBeenCalledWith(
      "/teaching-profile",
      expect.objectContaining({ schoolYears: [5, 6] })
    );
  });

  it("sends an empty schoolYears array when the profile has none", async () => {
    put.mockResolvedValue({ data: profile() });

    await teachingProfileService.save(profile());

    expect(put).toHaveBeenCalledWith(
      "/teaching-profile",
      expect.objectContaining({ schoolYears: [] })
    );
  });
});

describe("teachingProfileService.fetchSchoolSubjects", () => {
  it("calls the subjects endpoint with the encoded qualification code", async () => {
    const subjects = [
      {
        subjectCode: "ECO10",
        subjectName: "Economia",
        component: "cientifica" as const,
        hours: 200,
        groupLabel: null,
      },
    ];
    get.mockResolvedValue({ data: subjects });

    const result = await teachingProfileService.fetchSchoolSubjects("481RA116");

    expect(get).toHaveBeenCalledWith(
      "/teaching-profile/qualifications/481RA116/subjects"
    );
    expect(result).toEqual(subjects);
  });

  it("URL-encodes qualification codes with special characters", async () => {
    get.mockResolvedValue({ data: [] });

    await teachingProfileService.fetchSchoolSubjects("481/RA 116");

    expect(get).toHaveBeenCalledWith(
      "/teaching-profile/qualifications/481%2FRA%20116/subjects"
    );
  });
});
