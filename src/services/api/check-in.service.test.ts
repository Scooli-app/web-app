import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./client", () => ({ default: http }));

import type { CheckInSubmission } from "@/shared/types/check-in";
import { checkInService } from "./check-in.service";

const ok = <T,>(data: T) => Promise.resolve({ data });

beforeEach(() => {
  http.get.mockReset();
  http.post.mockReset();
});

describe("checkInService", () => {
  it("loads pending check-ins with the limit", async () => {
    http.get.mockReturnValue(ok([]));
    await expect(checkInService.getPending()).resolves.toEqual([]);
    expect(http.get).toHaveBeenCalledWith("/check-ins/pending", { params: { limit: 20 } });
  });

  it("requests a reinforcement sheet for one lesson's outcomes", async () => {
    http.post.mockReturnValue(ok({ documentId: "d1" }));

    await expect(checkInService.requestReinforcement("tt 1", "slot/9", ["o1", "o2"])).resolves.toEqual({
      documentId: "d1",
    });
    expect(http.post).toHaveBeenCalledWith(
      "/timetable/tt%201/lessons/slot%2F9/reinforcement",
      { outcomeIds: ["o1", "o2"] },
    );
  });

  it.each<[string, CheckInSubmission]>([
    ["TAUGHT", { result: "TAUGHT" }],
    ["NOT_HELD", { result: "NOT_HELD" }],
    ["TAUGHT_WITH_DIFFICULTIES", { result: "TAUGHT_WITH_DIFFICULTIES", difficultOutcomeIds: ["o1"] }],
    ["PARTIAL", { result: "PARTIAL", uncoveredOutcomeIds: ["o2", "o3"] }],
  ])("posts %s to the lesson's check-in route", async (_result, body) => {
    http.post.mockReturnValue(ok({ id: "c1", timetableId: "tt 1", teachingStatus: "TAUGHT", checkedInAt: "x" }));
    await checkInService.submit("tt 1", "slot/9", body);
    expect(http.post).toHaveBeenCalledWith("/timetable/tt%201/lessons/slot%2F9/check-in", body);
  });

  it("confirms all turmas with an empty body, or one turma when given", async () => {
    http.post.mockReturnValue(ok({ updated: 3 }));
    await expect(checkInService.confirmAll()).resolves.toEqual({ updated: 3 });
    expect(http.post).toHaveBeenLastCalledWith("/check-ins/confirm-all", {});

    await checkInService.confirmAll("tt-1");
    expect(http.post).toHaveBeenLastCalledWith("/check-ins/confirm-all", { timetableId: "tt-1" });
  });

  it("moves the following lessons on the lesson's shift-following route", async () => {
    http.post.mockReturnValue(ok({ shifted: 2, overflow: ["Geometria"] }));
    await expect(checkInService.shiftFollowing("tt 1", "slot/9")).resolves.toEqual({
      shifted: 2,
      overflow: ["Geometria"],
    });
    expect(http.post).toHaveBeenCalledWith("/timetable/tt%201/lessons/slot%2F9/shift-following");
  });

  it("lets errors reach the caller so the optimistic UI can roll back", async () => {
    http.post.mockRejectedValue(new Error("boom"));
    await expect(checkInService.submit("tt", "s", { result: "NOT_HELD" })).rejects.toThrow("boom");
  });
});
