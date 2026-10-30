// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/pt-PT.json";
import { MathFieldPopover } from "./MathFieldPopover";

// The formula editor's code could not be downloaded (offline, a deploy in between).
vi.mock("mathlive", () => {
  throw new Error("chunk failed to load");
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

describe("MathFieldPopover when the formula editor can't load", () => {
  // Review: it spun forever until a reload.
  it("says so and offers to try again", async () => {
    await act(async () => {
      root.render(
        <NextIntlClientProvider locale="pt-PT" messages={messages}>
          <MathFieldPopover tex="x" anchor={{ x: 0, y: 0 }} onSave={vi.fn()} onCancel={vi.fn()} />
        </NextIntlClientProvider>,
      );
    });
    await act(() => new Promise((r) => setTimeout(r, 0)));
    expect(document.body.textContent).toContain(messages.math.loadFailed);
    expect([...document.querySelectorAll("button")].some((b) => b.textContent === messages.math.retry)).toBe(true);
  });
});
