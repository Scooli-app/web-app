import { describe, expect, it } from "vitest";
import {
  applyRitualPatch,
  baselineAnalytics,
  buildCompletePayload,
  effectiveWeeklyEmail,
  initialRitualState,
  ritualDraftPatch,
  type RitualState,
} from "@/components/onboarding-v2/ritualState";

const state = (over: Partial<RitualState> = {}): RitualState => ({
  planningDay: 7,
  weeklyEmail: true as boolean | null,
  goals: [],
  source: null,
  sourceOther: "",
  prepHours: null,
  currentTools: [],
  classCount: null,
  ...over,
});

describe("buildCompletePayload (F2)", () => {
  it("sends goals: [] when the teacher removed every goal", () => {
    const payload = buildCompletePayload(state({ goals: [] }), false);
    expect(payload.goals).toEqual([]);
  });

  it("sends the current goals and source explicitly", () => {
    const payload = buildCompletePayload(
      state({ goals: ["CURIOSITY"], source: "OTHER", sourceOther: "  a friend " }),
      true,
    );
    expect(payload).toMatchObject({
      goals: ["CURIOSITY"],
      acquisitionSource: "OTHER",
      acquisitionSourceOther: "a friend",
      skippedClass: true,
    });
  });

  it("sends null for source only when it was never chosen, and drops stale other text", () => {
    expect(buildCompletePayload(state(), false)).toMatchObject({
      acquisitionSource: null,
      acquisitionSourceOther: null,
    });
    expect(
      buildCompletePayload(state({ source: "FACEBOOK", sourceOther: "left over" }), false),
    ).toMatchObject({ acquisitionSource: "FACEBOOK", acquisitionSourceOther: null });
  });

  it("always sends planning day and weeklyEmail", () => {
    expect(buildCompletePayload(state({ planningDay: 3, weeklyEmail: false }), false)).toMatchObject({
      planningDay: 3,
      weeklyEmail: false,
    });
  });
});

describe("lifted step-5 state (F7)", () => {
  it("starts from the server draft, with defaults", () => {
    expect(initialRitualState(null)).toEqual(state({ weeklyEmail: null }));
    expect(
      initialRitualState({
        schoolName: null,
        noSchool: null,
        teacherRole: null,
        planningDay: 3,
        weeklyEmail: false,
        goals: ["CURIOSITY"],
        acquisitionSource: "OTHER",
        acquisitionSourceOther: "x",
        prepHoursPerWeek: "H2_5",
        currentTools: ["AI_CHAT", "COLLEAGUES"],
        classCount: "C3_4",
      }),
    ).toEqual(
      state({
        planningDay: 3,
        weeklyEmail: false,
        goals: ["CURIOSITY"],
        source: "OTHER",
        sourceOther: "x",
        prepHours: "H2_5",
        currentTools: ["AI_CHAT", "COLLEAGUES"],
        classCount: "C3_4",
      }),
    );
  });

  it("keeps edits across what used to be an unmount (patches accumulate)", () => {
    let current = initialRitualState(null);
    current = applyRitualPatch(current, { planningDay: 2 });
    current = applyRitualPatch(current, { goals: ["CURIOSITY"] });
    expect(current).toEqual(
      state({ planningDay: 2, goals: ["CURIOSITY"], weeklyEmail: null }),
    );
  });

  it("builds a draft patch with the whole step-5 state", () => {
    expect(ritualDraftPatch(state({ goals: [], source: null }))).toEqual({
      step: 6,
      planningDay: 7,
      weeklyEmail: true,
      goals: [],
      acquisitionSourceOther: "",
      currentTools: [],
    });
    expect(
      ritualDraftPatch(state({ source: "OTHER", sourceOther: " amigo " })),
    ).toMatchObject({ acquisitionSource: "OTHER", acquisitionSourceOther: "amigo" });
  });
});

describe("weekly email choice (F4)", () => {
  const draftWith = (weeklyEmail: boolean | null) => ({
    schoolName: null,
    noSchool: null,
    teacherRole: null,
    planningDay: null,
    weeklyEmail,
    goals: null,
    acquisitionSource: null,
    acquisitionSourceOther: null,
  });

  it("starts from the server value; null means never chosen", () => {
    expect(initialRitualState(draftWith(false)).weeklyEmail).toBe(false);
    expect(initialRitualState(draftWith(true)).weeklyEmail).toBe(true);
    expect(initialRitualState(draftWith(null)).weeklyEmail).toBeNull();
    expect(initialRitualState(null).weeklyEmail).toBeNull();
  });

  it("shows the toggle ON while the choice is still null", () => {
    expect(effectiveWeeklyEmail(null)).toBe(true);
    expect(effectiveWeeklyEmail(false)).toBe(false);
  });

  it("does not autosave an untouched (null) choice", () => {
    const patch = ritualDraftPatch({ ...state(), weeklyEmail: null });
    expect("weeklyEmail" in patch).toBe(false);
    expect(ritualDraftPatch({ ...state(), weeklyEmail: false }).weeklyEmail).toBe(false);
  });

  it("Finish sends an explicit weeklyEmail even when untouched", () => {
    expect(buildCompletePayload({ ...state(), weeklyEmail: null }, false).weeklyEmail).toBe(true);
    expect(buildCompletePayload({ ...state(), weeklyEmail: false }, false).weeklyEmail).toBe(false);
  });
});

describe("baseline questions", () => {
  it("builds the draft patch for the step being edited, sending [] to clear the tools", () => {
    const answered = state({ prepHours: "GT10", currentTools: ["FROM_SCRATCH"], classCount: "C5_PLUS" });
    expect(ritualDraftPatch(answered, 5)).toMatchObject({
      step: 5,
      prepHoursPerWeek: "GT10",
      currentTools: ["FROM_SCRATCH"],
      classCount: "C5_PLUS",
    });
    const patch = ritualDraftPatch(state({ currentTools: [] }), 5);
    expect(patch.currentTools).toEqual([]);
    expect("prepHoursPerWeek" in patch).toBe(false);
    expect("classCount" in patch).toBe(false);
  });

  it("Finish sends the three answers explicitly (null / [] when never answered)", () => {
    expect(buildCompletePayload(state(), false)).toMatchObject({
      prepHoursPerWeek: null,
      currentTools: [],
      classCount: null,
    });
    expect(
      buildCompletePayload(
        state({ prepHours: "LT2", currentTools: ["AI_CHAT", "PUBLISHER"], classCount: "C1_2" }),
        false,
      ),
    ).toMatchObject({
      prepHoursPerWeek: "LT2",
      currentTools: ["AI_CHAT", "PUBLISHER"],
      classCount: "C1_2",
    });
  });

  it("restores unanswered baseline questions as empty", () => {
    const restored = initialRitualState(null);
    expect(restored).toMatchObject({ prepHours: null, currentTools: [], classCount: null });
  });

  it("reports only the answered questions to analytics", () => {
    expect(baselineAnalytics(state())).toEqual({});
    expect(
      baselineAnalytics(state({ prepHours: "H5_10", currentTools: ["COLLEAGUES"], classCount: "C3_4" })),
    ).toEqual({ prep_hours_per_week: "H5_10", current_tools: ["COLLEAGUES"], class_count: "C3_4" });
  });
});
