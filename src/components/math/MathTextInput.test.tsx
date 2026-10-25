// @vitest-environment jsdom
import { act } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MathTextInput } from "./MathTextInput";

// The formula field is MathLive in the app; here a plain input in a portal (as the real popover is).
vi.mock("./MathFieldPopover", () => ({
  MathFieldPopover: ({ within }: { within?: HTMLElement | null }) =>
    createPortal(<input data-testid="formula-field" aria-label="formula" />, within ?? document.body),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no layout; ProseMirror asks for rects when it scrolls the cursor into view.
  const noRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Element.prototype.getClientRects ??= noRects;
  Range.prototype.getClientRects ??= noRects;
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

const tick = (ms = 0) => act(() => new Promise((r) => setTimeout(r, ms)));

async function mount(value: string, props: Partial<Parameters<typeof MathTextInput>[0]> = {}, host: HTMLElement = container) {
  const onChange = vi.fn();
  if (host !== container) {
    act(() => root.unmount());
    root = createRoot(host);
  }
  await act(async () => {
    root.render(<MathTextInput value={value} onChange={onChange} {...props} />);
  });
  await tick();
  const editor = host.querySelector<HTMLElement>(".ProseMirror");
  if (!editor) throw new Error("no editor");
  return { onChange, editor };
}

describe("MathTextInput", () => {
  it.each(["custa 5$ e 3$", "Resolve $$x^2 = 4$$ agora", "Calcula $\\frac{___}{8}$."])(
    "leaves %s alone when it is only opened, focused and left",
    async (text) => {
      const onBlur = vi.fn();
      const { onChange, editor } = await mount(text, { onBlur });
      act(() => editor.focus());
      act(() => editor.blur());
      await tick();
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("finishes on Enter when asked to", async () => {
    const onEnter = vi.fn();
    const { editor } = await mount("a", { onEnter });
    act(() => { editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  // Seen in review: a click inside the open formula field sent focus back to the sentence around it.
  it("keeps focus in the open formula field when it is clicked", async () => {
    const { editor } = await mount("a $x$ b");
    const formula = editor.querySelector<HTMLElement>("[data-type=inline-math]");
    if (!formula) throw new Error("no formula");
    act(() => { formula.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await tick();
    const field = document.querySelector<HTMLInputElement>("[data-testid=formula-field]");
    if (!field) throw new Error("formula field did not open");
    act(() => field.focus());
    act(() => { field.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await tick(50);
    expect(document.activeElement).toBe(field);
  });

  // The phone exercise sheet is a modal dialog: the formula field must open inside it.
  it("opens the formula field inside the dialog the text is in", async () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    const { editor } = await mount("a $x$ b", {}, dialog);
    const formula = editor.querySelector<HTMLElement>("[data-type=inline-math]");
    act(() => { formula?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await tick();
    expect(dialog.querySelector("[data-testid=formula-field]")).not.toBeNull();
  });
});
