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
