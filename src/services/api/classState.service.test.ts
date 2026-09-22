import { describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

vi.mock("./client", () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
  },
}));

const {
  getClassState,
  getClassStateHistory,
  recordClassState,
  correctClassState,
  ClassStateConflictError,
} = await import("./classState.service");

const unconfirmed = {
  lessonId: "lesson-1",
  observed: false,
  outcome: "UNCONFIRMED",
  note: null,
  revision: 0,
  eventId: null,
  recordedAt: null,
  recordedByUserId: null,
};

describe("classState.service", () => {
  it("getClassState returns UNCONFIRMED for an unobserved lesson", async () => {
    get.mockResolvedValue({ data: unconfirmed });

    const result = await getClassState("tt-1", "lesson-1");

    expect(get).toHaveBeenCalledWith("/timetable/tt-1/lessons/lesson-1/class-state");
    expect(result.observed).toBe(false);
    expect(result.outcome).toBe("UNCONFIRMED");
  });

  it("getClassStateHistory hits the events sub-path", async () => {
    get.mockResolvedValue({ data: [] });

    await getClassStateHistory("tt-1", "lesson-1");

    expect(get).toHaveBeenCalledWith("/timetable/tt-1/lessons/lesson-1/class-state/events");
  });

  it("recordClassState posts the outcome and optional note", async () => {
    post.mockResolvedValue({
      data: { ...unconfirmed, observed: true, outcome: "AS_PLANNED", revision: 1 },
    });

    await recordClassState("tt-1", "lesson-1", "AS_PLANNED");

    expect(post).toHaveBeenCalledWith("/timetable/tt-1/lessons/lesson-1/class-state", {
      outcome: "AS_PLANNED",
      note: undefined,
    });
  });

  it("recordClassState surfaces a 409 as ClassStateConflictError", async () => {
    post.mockRejectedValue({
      response: {
        status: 409,
        data: { error: "outcome_already_recorded", message: "already recorded" },
      },
    });

    await expect(recordClassState("tt-1", "lesson-1", "AS_PLANNED")).rejects.toThrow(
      ClassStateConflictError,
    );
  });

  it("correctClassState omits note from the body when not provided, preserving the existing note", async () => {
    patch.mockResolvedValue({
      data: { ...unconfirmed, observed: true, outcome: "AS_PLANNED", revision: 2 },
    });

    await correctClassState("tt-1", "lesson-1", "AS_PLANNED", 1);

    expect(patch).toHaveBeenCalledWith("/timetable/tt-1/lessons/lesson-1/class-state", {
      outcome: "AS_PLANNED",
      expectedRevision: 1,
    });
  });

  it("correctClassState sends an explicit null to clear the note", async () => {
    patch.mockResolvedValue({
      data: { ...unconfirmed, observed: true, outcome: "AS_PLANNED", revision: 2 },
    });

    await correctClassState("tt-1", "lesson-1", "AS_PLANNED", 1, null);

    expect(patch).toHaveBeenCalledWith("/timetable/tt-1/lessons/lesson-1/class-state", {
      outcome: "AS_PLANNED",
      expectedRevision: 1,
      note: null,
    });
  });

  it("correctClassState surfaces a stale revision as ClassStateConflictError with currentRevision", async () => {
    patch.mockRejectedValue({
      response: {
        status: 409,
        data: { error: "stale_revision", message: "stale", currentRevision: 3 },
      },
    });

    await expect(correctClassState("tt-1", "lesson-1", "AS_PLANNED", 1)).rejects.toMatchObject({
      kind: "stale_revision",
      currentRevision: 3,
    });
  });
});
