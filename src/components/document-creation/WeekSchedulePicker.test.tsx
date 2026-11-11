// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WEEK_SCHEDULE, type WeekSchedule } from "@/lib/timetable/planToTimetable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock("posthog-js", () => ({ default: { capture: api.capture } }));

import { WeekSchedulePicker } from "./WeekSchedulePicker";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function render(schedule: WeekSchedule, onChange: (s: WeekSchedule) => void) {
  host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(createElement(WeekSchedulePicker, { schedule, onChange })));
  return host;
}

const buttonsLabelled = (view: HTMLElement, text: string) =>
  [...view.querySelectorAll("button")].filter((b) => b.textContent?.includes(text) || b.getAttribute("aria-label") === text);

beforeEach(() => api.capture.mockReset());

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("WeekSchedulePicker", () => {
  const monday: WeekSchedule = {
    ...DEFAULT_WEEK_SCHEDULE,
    mon: { enabled: true, periods: [{ durationMinutes: 90, type: "LESSON" }, { durationMinutes: 45, type: "EXERCISE" }] },
  };

  it("copies a day's periods to every other enabled day only", async () => {
    const onChange = vi.fn();
    const view = await render(monday, onChange);
    const [copyMonday] = buttonsLabelled(view, "documentCreation.weekSchedule.copyToOtherDays");
    await act(async () => copyMonday.click());

    const next: WeekSchedule = onChange.mock.calls[0][0];
    expect(next.wed.periods).toEqual(monday.mon.periods);
    expect(next.fri.periods).toEqual(monday.mon.periods);
    expect(next.tue).toBe(monday.tue);
    expect(api.capture).toHaveBeenCalledWith("schedule_bulk_action", expect.objectContaining({
      action: "copy_to_other_days",
      count: 2,
    }));
  });

  it("hides the copy action when only one day is enabled", async () => {
    const onlyMonday: WeekSchedule = { ...monday, wed: { ...monday.wed, enabled: false }, fri: { ...monday.fri, enabled: false } };
    const view = await render(onlyMonday, vi.fn());
    expect(buttonsLabelled(view, "documentCreation.weekSchedule.copyToOtherDays")).toHaveLength(0);
  });

  it("adds a period that copies the last one of the day", async () => {
    const onChange = vi.fn();
    const view = await render(monday, onChange);
    const [addMonday] = buttonsLabelled(view, "documentCreation.weekSchedule.addPeriod");
    await act(async () => addMonday.click());

    const next: WeekSchedule = onChange.mock.calls[0][0];
    expect(next.mon.periods).toEqual([...monday.mon.periods, { durationMinutes: 45, type: "EXERCISE" }]);
  });
});
