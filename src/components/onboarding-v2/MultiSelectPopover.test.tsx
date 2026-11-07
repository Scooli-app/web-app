// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { MultiSelectPopover } from "./MultiSelectPopover";

let root: Root | null = null;

function openPicker(values: string[], onToggle: (id: string) => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      createElement(MultiSelectPopover, {
        options: [
          { id: "historia-a", label: "História A" },
          { id: "portugues", label: "Português" },
        ],
        values,
        onToggle,
        placeholder: "Escolhe",
        countLabel: (count: number) => `${count} selected`,
        labelledBy: "subjects",
      })
    )
  );
  act(() => host.querySelector("button")!.click());
  return Array.from(document.querySelectorAll<HTMLElement>('[role="checkbox"]'));
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("MultiSelectPopover", () => {
  it("fires one click event and one toggle per click on a row's label", () => {
    const onToggle = vi.fn();
    openPicker([], onToggle);
    const label = Array.from(document.querySelectorAll("span")).find((el) => el.textContent === "História A")!;
    const clicks = vi.fn();
    document.addEventListener("click", clicks);

    act(() => label.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    document.removeEventListener("click", clicks);

    expect(clicks).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("historia-a");
  });

  it("marks only the selected rows as checked", () => {
    const rows = openPicker(["portugues"], vi.fn());

    expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "true"]);
  });
});
