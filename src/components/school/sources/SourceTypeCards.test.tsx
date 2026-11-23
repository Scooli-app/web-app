// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/pt-PT.json";
import { SourceTypeCards } from "./SourceTypeCards";

let container: HTMLDivElement;
let root: Root;
const onChange = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const render = () =>
  act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <SourceTypeCards value="regra" onChange={onChange} />
      </NextIntlClientProvider>,
    );
  });

describe("SourceTypeCards", () => {
  it("selects a type by clicking anywhere on its card, with one radio per card", async () => {
    await render();
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    const hint = [...container.querySelectorAll("span")].find((s) => s.textContent === "Entra quando o tema corresponde");
    await act(async () => hint?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("apoio");
  });

  it("is one native radio group, so the arrow keys move between the cards", async () => {
    await render();
    const radios = [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    expect(radios.map((r) => r.checked)).toEqual([true, false]);
    expect(radios.every((r) => r.closest("label") && r.tabIndex !== -1)).toBe(true);
  });
});
