import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), captureException: vi.fn() } }));
vi.mock("@/hooks/usePlanLimits", () => ({ invalidatePlanLimits: vi.fn() }));
vi.mock("@/i18n/clientLocale", () => ({ resolveEffectiveContentLanguage: () => "pt-PT" }));
vi.mock("@/components/onboarding-v2/planGenerationMarker", () => ({
  claimLease: () => true,
  clearMarker: vi.fn(),
  releaseLease: vi.fn(),
  readMarker: () => null,
  markerKey: () => "marker",
}));
vi.mock("@/services/api/me.service", () => ({
  meService: { getWindow: vi.fn(), getWeek: vi.fn() },
}));
vi.mock("@/services/api/timetable.service", () => ({
  generateTopics: vi.fn(),
  listLessons: vi.fn(),
  generateWeek: vi.fn(),
  generateLesson: vi.fn(),
  listTimetables: vi.fn(),
}));

import { startPlanGeneration } from "@/components/onboarding-v2/planGenerationRunner";
import { meService } from "@/services/api/me.service";
import { generateTopics, generateWeek, listLessons } from "@/services/api/timetable.service";

const lesson = (id: string, slotDate: string) => ({
  id,
  slotDate,
  slotType: "LESSON",
  status: "pending",
  topicTitle: "Frações",
});

describe("onboarding plan generation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Thursday: the old calendar-week rule left only Friday's lesson.
    vi.setSystemTime(new Date(2026, 10, 5, 18, 0));
    vi.mocked(generateTopics).mockResolvedValue({ updated: 20 } as never);
    vi.mocked(listLessons).mockResolvedValue([]);
    vi.mocked(generateWeek).mockResolvedValue(undefined);
    vi.mocked(meService.getWindow).mockResolvedValue({
      classes: [{ timetableId: "t1", lessons: [lesson("fri", "2026-11-06"), lesson("mon", "2026-11-09")] }],
    } as never);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("prepares the next 7 days from today, not the calendar week", async () => {
    startPlanGeneration(
      {
        dispatch: vi.fn() as never,
        getState: () => ({ ui: { contentLanguage: null, interfaceLocale: "pt-PT" } }) as never,
        getToken: async () => "token",
        userId: "user",
      },
      "t1",
    );

    await vi.waitFor(() => expect(generateWeek).toHaveBeenCalled());
    expect(meService.getWindow).toHaveBeenCalledWith("2026-11-05");
    expect(meService.getWeek).not.toHaveBeenCalled();
    expect(vi.mocked(generateWeek).mock.calls[0].slice(0, 2)).toEqual(["t1", "2026-11-05"]);
  });
});
