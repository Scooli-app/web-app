// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const formatter = actual.createFormatter({ locale: "pt-PT", timeZone: "UTC" });
  return {
    useTranslations: () => (key: string) => key,
    useFormatter: () => formatter,
  };
});
vi.mock("@/i18n/dateFns", () => ({ useDateFnsLocale: () => undefined }));

import { DatePicker } from "./date-picker";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function openPicker(props: Parameters<typeof DatePicker>[0]) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const created = createRoot(el);
  act(() => created.render(createElement(DatePicker, props)));
  root = created;
  host = el;
  act(() => el.querySelector("button")?.click());
}

function dropdownValues() {
  const selects = document.querySelectorAll<HTMLSelectElement>("[role='dialog'] select");
  return [...selects].map((s) => s.value);
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("DatePicker navigation", () => {
  it("opens an empty picker on the month of fromDate", () => {
    openPicker({ fromDate: new Date(2027, 5, 10) });

    // Month (0-based) and year dropdowns.
    expect(dropdownValues()).toEqual(["5", "2027"]);
  });

  it("offers years after the current one in the year dropdown", () => {
    openPicker({});

    const years = [...document.querySelectorAll<HTMLOptionElement>("[role='dialog'] select option")].map(
      (o) => o.value
    );
    expect(years).toContain(String(new Date().getFullYear() + 1));
  });

  it("keeps the date when the selected day is clicked again", () => {
    const onChange = vi.fn();
    openPicker({ value: new Date(2026, 8, 16), onChange });

    act(() => document.querySelector<HTMLButtonElement>("td[data-day='2026-09-16'] button")?.click());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(new Date(2026, 8, 16));
  });
});
