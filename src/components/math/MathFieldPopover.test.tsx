// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/pt-PT.json";
import { MathFieldPopover } from "./MathFieldPopover";

// A stand-in for MathLive's <math-field>: it writes the formula back its own way (x^{2} → x^2), as MathLive can.
vi.mock("mathlive", () => {
  class MathfieldElement extends HTMLElement {
    static fontsDirectory: string | null = "";
    static soundsDirectory: string | null = "";
    menuItems: unknown[] = [];
    mathVirtualKeyboardPolicy = "";
    smartFence = false;
    private latex = "";
    set value(v: string) { this.latex = v; }
    get value() { return this.latex; }
    getValue() { return this.latex.replace("x^{2}", "x^2"); }
    executeCommand() { /* not needed here */ }
  }
  if (!customElements.get("math-field")) customElements.define("math-field", MathfieldElement);
  return { MathfieldElement };
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  (window as unknown as { mathVirtualKeyboard: { container: HTMLElement | null } }).mathVirtualKeyboard = { container: null };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

async function open(props: Partial<Parameters<typeof MathFieldPopover>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <MathFieldPopover tex="x^{2}" anchor={{ x: 10, y: 10 }} onSave={onSave} onCancel={onCancel} {...props} />
      </NextIntlClientProvider>,
    );
  });
  await act(() => new Promise((r) => setTimeout(r, 0)));
  const field = document.querySelector("math-field");
  if (!field) throw new Error("no formula field");
  return { onSave, onCancel, field };
}

describe("MathFieldPopover", () => {
  // Opening a formula and clicking away must not rewrite it (and mark the document edited).
  it("saves an untouched formula exactly as it was, even when the field writes it differently", async () => {
    const { onSave } = await open();
    act(() => { document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })); });
    expect(onSave).toHaveBeenCalledWith("x^{2}");
  });

  // Seen in review: Backspace in a slide formula deleted the selected slide element.
  it("keeps keys typed in the formula away from the page", async () => {
    const { field } = await open();
    const page = vi.fn();
    window.addEventListener("keydown", page);
    act(() => { field.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true })); });
    act(() => { field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); });
    window.removeEventListener("keydown", page);
    expect(page).not.toHaveBeenCalled();
  });

  // Seen in review: inside a phone sheet (a modal dialog) the popover and its keyboard were outside the dialog.
  it("opens inside the dialog it was opened from, with MathLive's keyboard there too", async () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    await open({ within: dialog });
    expect(dialog.querySelector("math-field")).not.toBeNull();
    expect((window as unknown as { mathVirtualKeyboard: { container: HTMLElement | null } }).mathVirtualKeyboard.container).toBe(dialog);
  });
});
