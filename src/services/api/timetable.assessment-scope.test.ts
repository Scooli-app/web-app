import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./client", () => ({ default: http }));
vi.mock("@/store/featureFeedbackTrigger", () => ({ featureFeedbackTrigger: vi.fn() }));

import { generateLessonDocument, getAssessmentScope } from "./timetable.service";

beforeEach(() => {
  http.get.mockReset();
  http.post.mockReset();
  http.post.mockResolvedValue({ status: 202, data: { id: "doc-1", status: "generating" } });
});

describe("getAssessmentScope", () => {
  it("calls the owner-scoped assessment-scope route of the slot", async () => {
    http.get.mockResolvedValue({ data: { fromDate: null, outcomes: [] } });
    await getAssessmentScope("tt 1", "slot/2");
    expect(http.get).toHaveBeenCalledWith("/timetable/tt 1/lessons/slot/2/assessment-scope");
  });

  it("returns the scope as the backend sends it", async () => {
    const scope = {
      fromDate: "2026-09-14",
      outcomes: [{ id: "o1", text: "Ler números até 100", topicPath: ["Números"], lessons: 2 }],
    };
    http.get.mockResolvedValue({ data: scope });
    await expect(getAssessmentScope("tt", "s")).resolves.toEqual(scope);
  });
});

describe("generateLessonDocument", () => {
  it("sends only the document type when no outcomes are chosen (the whole scope is used)", async () => {
    await generateLessonDocument("tt", "s", "test");
    expect(http.post).toHaveBeenCalledWith("/timetable/tt/lessons/s/documents/generate", { documentType: "test" });
  });

  it("sends the chosen outcome ids with a test", async () => {
    await generateLessonDocument("tt", "s", "test", ["o1", "o3"]);
    expect(http.post).toHaveBeenCalledWith("/timetable/tt/lessons/s/documents/generate", {
      documentType: "test",
      outcomeIds: ["o1", "o3"],
    });
  });

  it("sends the lesson dialog's instruction, trimmed, and leaves a blank one out", async () => {
    await generateLessonDocument("tt", "s", "presentation", undefined, "  Inclui um jogo de pistas ");
    expect(http.post).toHaveBeenLastCalledWith("/timetable/tt/lessons/s/documents/generate", {
      documentType: "presentation",
      instruction: "Inclui um jogo de pistas",
    });

    await generateLessonDocument("tt", "s", "quiz", undefined, "   ");
    expect(http.post).toHaveBeenLastCalledWith("/timetable/tt/lessons/s/documents/generate", { documentType: "quiz" });
  });
});
