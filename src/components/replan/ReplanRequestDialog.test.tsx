// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReplanRequestDialog } from "./ReplanRequestDialog";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/hooks/useReplan", () => ({ useReplan: () => ({ requestReplan: vi.fn(async () => true) }) }));

describe("ReplanRequestDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(ReplanRequestDialog, {
          timetableId: "tt1",
          open: true,
          onOpenChange: vi.fn(),
        }),
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("puts the note label and field inside the padded content, like the title and buttons", () => {
    const content = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
    const textarea = document.getElementById("replan-note");
    const label = content?.querySelector("label[for='replan-note']");
    expect(content).not.toBeNull();
    expect(textarea).not.toBeNull();
    expect(label).not.toBeNull();

    // The field's wrapper carries the horizontal padding, so it lines up with the header and footer.
    const wrapper = textarea?.parentElement;
    expect(wrapper?.className).toContain("px-6");
    expect(wrapper?.contains(label ?? null)).toBe(true);
    expect(wrapper?.parentElement).toBe(content);

    const header = content?.querySelector('[data-slot="dialog-header"]');
    const footer = content?.querySelector('[data-slot="dialog-footer"]');
    expect(header?.className).toContain("p-6");
    expect(footer?.className).toContain("p-6");
  });
});
