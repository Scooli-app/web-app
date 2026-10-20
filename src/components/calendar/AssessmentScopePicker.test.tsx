// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssessmentScope } from "@/services/api/timetable.service";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-PT",
}));

import { AssessmentScopePicker } from "./AssessmentScopePicker";

const scope: AssessmentScope = {
  fromDate: "2026-09-14",
  outcomes: [
    { id: "o1", text: "Ler números até 100", topicPath: ["Números"], lessons: 2 },
    { id: "o2", text: "Comparar frações", topicPath: ["Frações"], lessons: 1 },
  ],
};

describe("AssessmentScopePicker", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  function chips(): HTMLButtonElement[] {
    return [...container.querySelectorAll("button")];
  }

  async function render(props: Partial<Parameters<typeof AssessmentScopePicker>[0]> = {}) {
    await act(async () => {
      root.render(
        createElement(AssessmentScopePicker, {
          scope,
          selected: ["o1", "o2"],
          onToggle: vi.fn(),
          ...props,
        }),
      );
    });
  }

  it("shows one chip per outcome, all pressed when ticked", async () => {
    await render();

    expect(chips().map((c) => c.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Ler números até 100"), expect.stringContaining("Comparar frações")]),
    );
    expect(chips().every((c) => c.getAttribute("aria-pressed") === "true")).toBe(true);
  });

  it("reports the outcome whose chip was clicked", async () => {
    const onToggle = vi.fn();
    await render({ selected: ["o1"], onToggle });

    const second = chips().find((c) => c.textContent?.includes("Comparar frações"));
    await act(async () => {
      second?.click();
    });

    expect(onToggle).toHaveBeenCalledWith("o2");
    expect(chips().find((c) => c.textContent?.includes("Comparar frações"))?.getAttribute("aria-pressed")).toBe("false");
  });

  it("tags an assumed outcome as not confirmed, and leaves it unticked when the scope gives it so", async () => {
    const withAssumed: AssessmentScope = {
      fromDate: null,
      outcomes: [
        { id: "o1", text: "Ler números até 100", topicPath: ["Números"], lessons: 2, evidence: "confirmed" },
        { id: "o2", text: "Comparar frações", topicPath: ["Frações"], lessons: 1, evidence: "assumed" },
      ],
    };
    await render({ scope: withAssumed, selected: ["o1"] });

    const assumed = chips().find((c) => c.textContent?.includes("Comparar frações"));
    const confirmed = chips().find((c) => c.textContent?.includes("Ler números até 100"));
    expect(assumed?.textContent).toContain("notConfirmed");
    expect(assumed?.getAttribute("aria-pressed")).toBe("false");
    expect(confirmed?.textContent).not.toContain("notConfirmed");
    expect(confirmed?.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows no tag on an outcome with no evidence, as an older backend sends it", async () => {
    await render();

    expect(chips().some((c) => c.textContent?.includes("notConfirmed"))).toBe(false);
  });

  it("shows the empty state, with no chips, when nothing has been taught since the last test", async () => {
    await render({ scope: { fromDate: null, outcomes: [] }, selected: [] });

    expect(chips()).toHaveLength(0);
    expect(container.textContent).toContain("empty");
  });

  it("asks for at least one outcome when none is ticked", async () => {
    await render({ selected: [] });

    expect(container.textContent).toContain("pickAtLeastOne");
  });
});
