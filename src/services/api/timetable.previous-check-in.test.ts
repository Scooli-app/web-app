import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./client", () => ({ default: http }));
vi.mock("@/store/featureFeedbackTrigger", () => ({ featureFeedbackTrigger: vi.fn() }));

import { getPreviousCheckIn } from "./timetable.service";

beforeEach(() => {
  http.get.mockReset();
});

describe("getPreviousCheckIn", () => {
  it("calls the owner-scoped previous-check-in route of the slot", async () => {
    http.get.mockResolvedValue({ status: 204, data: "" });
    await getPreviousCheckIn("tt 1", "slot/2");
    expect(http.get).toHaveBeenCalledWith("/timetable/tt 1/lessons/slot/2/previous-check-in");
  });

  it("maps 204 (nothing to ask) to null", async () => {
    http.get.mockResolvedValue({ status: 204, data: "" });
    await expect(getPreviousCheckIn("tt", "s")).resolves.toBeNull();
  });

  it("returns the previous lesson when the backend has one to ask about", async () => {
    const body = {
      slotId: "prev",
      date: "2026-10-16",
      topicTitle: "Frações",
      slotType: "LESSON",
      outcomes: [],
    };
    http.get.mockResolvedValue({ status: 200, data: body });
    await expect(getPreviousCheckIn("tt", "s")).resolves.toEqual(body);
  });
});
