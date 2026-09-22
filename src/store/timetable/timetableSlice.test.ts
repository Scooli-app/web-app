import { describe, expect, it } from "vitest";
import reducer, { createTimetable } from "./timetableSlice";
import type { Timetable } from "@/services/api/timetable.service";

const timetable: Timetable = {
  id: "timetable-1",
  title: "7.º A Matemática",
  subject: "Mathematics",
  gradeLevel: 7,
  classLabel: "A",
  color: "#7F77DD",
  periodStart: "2026-09-01",
  periodEnd: "2027-06-30",
  schoolYearLabel: "2026/2027",
  creationMode: "custom",
  linkedCurriculumPlan: "",
  status: "active",
  createdAt: "2026-09-21T00:00:00Z",
  updatedAt: "2026-09-21T00:00:00Z",
};

describe("timetable creation state", () => {
  it("starts idle so a direct visit to /calendar/novo is usable", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state.isCreating).toBe(false);
  });

  it("tracks only the create request as submitting", () => {
    const initial = reducer(undefined, { type: "@@INIT" });
    const pending = reducer(initial, { type: createTimetable.pending.type });
    const fulfilled = reducer(pending, {
      type: createTimetable.fulfilled.type,
      payload: timetable,
    });

    expect(pending.isCreating).toBe(true);
    expect(fulfilled.isCreating).toBe(false);
  });

  it("clears submitting state when creation fails", () => {
    const initial = reducer(undefined, { type: createTimetable.pending.type });
    const rejected = reducer(initial, {
      type: createTimetable.rejected.type,
      payload: "Não foi possível criar a turma.",
    });

    expect(rejected.isCreating).toBe(false);
  });
});
