import type { Suggestion } from "@/shared/types/suggestions";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NextStepsView } from "./NextStepsCard";

// Each translated string renders as its key, followed by its values, so the tests can read the copy.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? [key, ...Object.values(values)].join("|") : key,
  useLocale: () => "pt-PT",
}));

function step(overrides: Partial<Suggestion>): Suggestion {
  return {
    kind: "prepare_next",
    timetableId: "t1",
    turmaTitle: "7.º A",
    slotId: "s1",
    slotDate: "2026-10-20",
    topicTitle: null,
    outcomeIds: [],
    outcomeTexts: [],
    count: null,
    ...overrides,
  };
}

function render(items: Suggestion[], props: { showTurma?: boolean; busyKey?: string | null } = {}) {
  return renderToStaticMarkup(
    createElement(NextStepsView, {
      items,
      showTurma: props.showTurma ?? false,
      busyKey: props.busyKey ?? null,
      onAction: () => undefined,
    }),
  );
}

describe("NextStepsView", () => {
  it("renders nothing when there is no step to show", () => {
    expect(render([])).toBe("");
    expect(render([step({ kind: "unknown" as Suggestion["kind"] })])).toBe("");
  });

  it("gives each kind its sentence and its one action", () => {
    const html = render([
      step({ kind: "prepare_next", slotId: "s1" }),
      step({ kind: "replan_not_held", slotId: "s2" }),
      step({ kind: "reinforce", slotId: "s3", outcomeIds: ["o1"], outcomeTexts: ["Frações"] }),
    ]);

    expect(html).toContain("prepareNext|");
    expect(html).toContain("replanNotHeld");
    expect(html).toContain("reinforce|Frações");
    expect(html).toContain("actionPrepare");
    expect(html).toContain("actionReschedule");
    expect(html).toContain("actionReinforce");
  });

  it("uses the view action for the dashboard check-in step", () => {
    const html = render([step({ kind: "check_in", timetableId: null, slotId: null, slotDate: null, count: 2 })]);

    expect(html).toContain("checkIn|2");
    expect(html).toContain("actionView");
  });

  it("names the turma only when asked (the dashboard lists several)", () => {
    expect(render([step({})], { showTurma: false })).not.toContain("· 7.º A");
    expect(render([step({})], { showTurma: true })).toContain("· 7.º A");
  });

  it("disables the step that is busy and leaves the others enabled", () => {
    const busy = step({ kind: "reinforce", slotId: "s9", outcomeIds: ["o1"], outcomeTexts: ["x"] });
    const idle = step({ kind: "replan_not_held", slotId: "s8" });
    const busyKey = "reinforce|s9|o1";

    const html = render([busy, idle], { busyKey });

    const disabledCount = (html.match(/disabled=""/g) ?? []).length;
    expect(disabledCount).toBe(1);
  });

  it("shows at most three steps", () => {
    const items = [1, 2, 3, 4].map((n) => step({ slotId: `s${n}`, turmaTitle: `T${n}` }));

    const html = render(items, { showTurma: true });

    expect(html).toContain("T3");
    expect(html).not.toContain("T4");
  });
});
