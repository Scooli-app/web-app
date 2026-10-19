import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./client", () => ({ default: http }));

import { getSuggestions, getTurmaSuggestions } from "./suggestions.service";

const ok = <T,>(data: T) => Promise.resolve({ data });

beforeEach(() => {
  http.get.mockReset();
});

describe("suggestions service", () => {
  it("loads the steps across turmas with the limit", async () => {
    http.get.mockReturnValue(ok([]));

    await expect(getSuggestions(3)).resolves.toEqual([]);
    expect(http.get).toHaveBeenCalledWith("/suggestions", { params: { limit: 3 } });
  });

  it("defaults the limit to three", async () => {
    http.get.mockReturnValue(ok([]));

    await getSuggestions();

    expect(http.get).toHaveBeenCalledWith("/suggestions", { params: { limit: 3 } });
  });

  it("loads the steps of one turma, encoding its id", async () => {
    http.get.mockReturnValue(ok([]));

    await getTurmaSuggestions("tt 1/2");

    expect(http.get).toHaveBeenCalledWith("/timetable/tt%201%2F2/suggestions");
  });
});
