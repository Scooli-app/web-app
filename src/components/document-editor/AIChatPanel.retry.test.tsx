// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () =>
    Object.assign((key: string) => key, { raw: () => ({ default: [{ label: "chip", message: "Add an exercise" }] }) }),
}));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/hooks/useAccountAccess", () => ({ useAccountAccess: () => ({ isLocked: false, guard: () => true }) }));
vi.mock("@/hooks/use-keyboard-inset", () => ({ useKeyboardInset: () => 0 }));

const { default: AIChatPanel } = await import("./AIChatPanel");

type Props = Parameters<typeof AIChatPanel>[0];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (props: Partial<Props>) =>
  act(() => {
    root.render(createElement(AIChatPanel, { onChatSubmit: vi.fn(), chatHistory: [], ...props }));
  });

const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === text);

describe("AIChatPanel", () => {
  it("sends the last message again from the error's retry button", async () => {
    const onChatSubmit = vi.fn().mockResolvedValue(true);
    render({ onChatSubmit, retryable: true });
    await act(async () => button("chip")?.click());
    expect(onChatSubmit).toHaveBeenLastCalledWith("Add an exercise");

    render({ onChatSubmit, retryable: true, error: "failed" });
    expect(container.querySelector("[role=alert]")?.textContent).toContain("failed");
    await act(async () => button("retry")?.click());

    expect(onChatSubmit).toHaveBeenCalledTimes(2);
    expect(onChatSubmit).toHaveBeenLastCalledWith("Add an exercise");
  });

  it("has no retry button unless the editor asks for one", () => {
    render({ error: "failed" });
    expect(button("retry")).toBeUndefined();
  });

  it("shows the wait hint under the typing indicator and marks replies that changed nothing", () => {
    render({
      isStreaming: true,
      pendingHint: "Still working",
      chatHistory: [{ role: "assistant", content: "I could not apply this change.", noChange: true }],
    });
    expect(container.querySelector("[role=status]")?.textContent).toBe("Still working");
    expect(container.textContent).toContain("documentUnchanged");
  });
});
