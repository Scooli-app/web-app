import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./client", () => ({ default: http }));

import { getTurmaProgress } from "./progress.service";

const payload = {
  asOf: "2026-10-19",
  coverage: { outcomesTotal: 2, outcomesCovered: 2, outcomesPartial: 0, percent: 100, curriculumTotal: 3 },
  slots: {
    past: 6,
    counts: { planned: 2, taught: 1, partiallyTaught: 1, notHeld: 1, assumedTaught: 1 },
    pendingCheckIns: 1,
  },
  behindSchedule: {
    lessonsBehind: 1,
    items: [{ unitOrder: 2, label: "Números racionais", plannedDate: "2026-10-05", lessonsBehind: 1, uncoveredOutcomes: 1 }],
  },
  flaggedOutcomes: [],
  nextAssessment: null,
};

beforeEach(() => {
  http.get.mockReset();
});

describe("getTurmaProgress", () => {
  it("loads the progress of one turma and returns the body unchanged", async () => {
    http.get.mockResolvedValue({ data: payload });
    await expect(getTurmaProgress("tt-1")).resolves.toEqual(payload);
    expect(http.get).toHaveBeenCalledWith("/timetable/tt-1/progress");
  });

  it("encodes the timetable id in the path", async () => {
    http.get.mockResolvedValue({ data: payload });
    await getTurmaProgress("tt 1/x");
    expect(http.get).toHaveBeenCalledWith("/timetable/tt%201%2Fx/progress");
  });

  it("lets errors (403 flag off, 404 another user's turma) reach the caller", async () => {
    http.get.mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));
    await expect(getTurmaProgress("tt-1")).rejects.toThrow("Forbidden");
  });
});
