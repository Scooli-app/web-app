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
    expect(html).toContain("replanNotHeldShift");
    expect(html).toContain("reinforce|Frações");
    expect(html).toContain("actionPrepare");
    expect(html).toContain("actionShift");
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

  it("gives each kind its icon and a coloured left accent", () => {
    const html = render([
      step({ kind: "prepare_next", slotId: "s1" }),
      step({ kind: "replan_not_held", slotId: "s2" }),
      step({ kind: "reinforce", slotId: "s3", outcomeIds: ["o1"], outcomeTexts: ["Frações"] }),
    ]);
    const checkIn = render([step({ kind: "check_in", timetableId: null, slotId: null, slotDate: null, count: 2 })]);

    expect(html).toContain("lucide-file-plus");
    expect(html).toContain("lucide-calendar-clock");
    expect(html).toContain("lucide-target");
    expect(checkIn).toContain("lucide-list-checks");
    expect(html).toContain("border-l-primary");
    expect(html).toContain("border-l-amber-500");
    expect(html).toContain("border-l-rose-500");
    expect(checkIn).toContain("border-l-emerald-500");
  });

  it("gives the primary button to the first step only", () => {
    const rows = render([
      step({ kind: "prepare_next", slotId: "s1" }),
      step({ kind: "replan_not_held", slotId: "s2" }),
    ]).split("<li").slice(1);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("bg-primary");
    expect(rows[1]).not.toContain("bg-primary");
  });

  it("names the non-Pro move 'Mover aulas seguintes' and keeps 'Reajustar' for Pro's review", () => {
    const items = [step({ kind: "replan_not_held", slotId: "s2" })];

    const nonPro = renderToStaticMarkup(
      createElement(NextStepsView, { items, showTurma: false, busyKey: null, onAction: () => undefined }),
    );
    expect(nonPro).toContain("actionShift");
    expect(nonPro).not.toContain("actionReschedule");
    expect(nonPro).toContain("replanNotHeldShift");
    expect(nonPro).not.toContain("replanNotHeld|");

    const pro = renderToStaticMarkup(
      createElement(NextStepsView, { items, showTurma: false, isPro: true, busyKey: null, onAction: () => undefined }),
    );
    expect(pro).toContain("actionReschedule");
    expect(pro).not.toContain("actionShift");
    expect(pro).toContain("replanNotHeld");
    expect(pro).not.toContain("replanNotHeldShift");
  });

  it("sets the heading in sentence case, not uppercase tracked caps", () => {
    const html = render([step({})]);
    const heading = html.match(/<h3[^>]*>/)?.[0] ?? "";

    expect(heading).toContain("font-semibold");
    expect(heading).not.toContain("uppercase");
    expect(heading).not.toContain("tracking-wide");
  });

  it("shows at most three steps", () => {
    const items = [1, 2, 3, 4].map((n) => step({ slotId: `s${n}`, turmaTitle: `T${n}` }));

    const html = render(items, { showTurma: true });

    expect(html).toContain("T3");
    expect(html).not.toContain("T4");
  });
});
