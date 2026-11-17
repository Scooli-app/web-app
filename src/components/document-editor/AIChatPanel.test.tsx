// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/pt-PT.json";
import AIChatPanel, { type ChatMessage } from "./AIChatPanel";

vi.mock("@/hooks/useAccountAccess", () => ({ useAccountAccess: () => ({ isLocked: false, guard: () => true }) }));
vi.mock("@/hooks/use-keyboard-inset", () => ({ useKeyboardInset: () => 0 }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

const edit: ChatMessage = {
  role: "assistant",
  content: "Acrescentei uma grelha de observação à avaliação.",
  hasUpdate: true,
  outcome: "edit",
  charged: true,
  changes: [
    { kind: "changed", section: "Avaliação" },
    { kind: "added", section: "Atividade de Grupo" },
  ],
  followUps: ["Adiciona a chave de correção"],
};

async function render(history: ChatMessage[], props: Partial<Parameters<typeof AIChatPanel>[0]> = {}) {
  const onChatSubmit = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <AIChatPanel onChatSubmit={onChatSubmit} chatHistory={history} documentType="lessonPlan" {...props} />
      </NextIntlClientProvider>,
    );
  });
  // Desktop and mobile both render the chat content; the desktop copy comes first.
  return { onChatSubmit, panel: container.querySelector('[data-chat-panel="desktop"]') as HTMLElement };
}

function click(el: Element | null | undefined) {
  if (!el) throw new Error("element not found");
  act(() => {
    (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("AIChatPanel", () => {
  it("lists what an edit changed and scrolls to a section on click (ENG-404)", async () => {
    const onChangeClick = vi.fn();
    const { panel } = await render([{ role: "user", content: "x" }, edit], { onChangeClick });
    const list = panel.querySelector('[data-testid="chat-change-list"]');
    expect(list?.textContent).toContain("Alterado: Avaliação");
    expect(list?.textContent).toContain("Novo: Atividade de Grupo");
    click(list?.querySelector("button"));
    expect(onChangeClick).toHaveBeenCalledWith({ kind: "changed", section: "Avaliação" });
  });

  it("sends a follow-up chip as the next message (ENG-405)", async () => {
    const { panel, onChatSubmit } = await render([{ role: "user", content: "x" }, edit]);
    click(panel.querySelector('[data-testid="chat-follow-ups"] button'));
    expect(onChatSubmit).toHaveBeenCalledWith("Adiciona a chave de correção");
  });

  it("offers clarification options instead of guessing (ENG-406)", async () => {
    const clarify: ChatMessage = {
      role: "assistant",
      content: "O que queres melhorar primeiro?",
      outcome: "clarify",
      charged: false,
      clarifyOptions: ["Mais exercícios", "Exercícios mais difíceis"],
    };
    const { panel, onChatSubmit } = await render([{ role: "user", content: "está fraquinha" }, clarify]);
    const options = panel.querySelectorAll('[data-testid="chat-clarify-options"] button');
    expect(Array.from(options).map((b) => b.textContent)).toEqual(["Mais exercícios", "Exercícios mais difíceis"]);
    click(options[1]);
    expect(onChatSubmit).toHaveBeenCalledWith("Exercícios mais difíceis");
    // A clarification is free but saying so would be noise.
    expect(panel.textContent).not.toContain("Não contou como geração");
  });

  it("says when nothing changed and that it was free (ENG-394, ENG-400)", async () => {
    const noChange: ChatMessage = {
      role: "assistant",
      content: "Não alterei o documento: o resultado ficou igual ao original.",
      outcome: "no_change",
      charged: false,
    };
    const { panel } = await render([{ role: "user", content: "põe o link" }, noChange]);
    expect(panel.querySelector('[data-outcome="no_change"]')?.textContent).toContain("Sem alterações ao documento");
    expect(panel.textContent).toContain("Não contou como geração");
  });

  it("offers to create a separate document (ENG-409)", async () => {
    const onNewDocument = vi.fn().mockResolvedValue(undefined);
    const offer: ChatMessage = {
      role: "assistant",
      content: "Isso é um documento à parte.",
      outcome: "new_document",
      newDocument: { type: "worksheet", instructions: "10 exercícios" },
    };
    const { panel } = await render([{ role: "user", content: "cria uma ficha" }, offer], { onNewDocument });
    const button = panel.querySelector('[data-testid="chat-new-document"]');
    expect(button?.textContent).toContain("Criar ficha de trabalho a partir deste documento");
    await act(async () => {
      (button as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onNewDocument).toHaveBeenCalledWith({ type: "worksheet", instructions: "10 exercícios" });
  });

  it("collects 👍/👎 and starts a new conversation (ENG-387, ENG-396)", async () => {
    const onFeedback = vi.fn();
    const onNewConversation = vi.fn();
    const { panel } = await render([{ role: "user", content: "x" }, edit], { onFeedback, onNewConversation });
    click(panel.querySelector('button[aria-label="Resposta pouco útil"]'));
    expect(onFeedback).toHaveBeenCalledWith(1, "down");
    click(panel.querySelector('[data-testid="chat-new-conversation"]'));
    expect(onNewConversation).toHaveBeenCalled();
  });

  it("marks a loaded conversation and shows progress while working", async () => {
    const { panel } = await render(
      [
        { role: "user", content: "Mais exercícios", fromHistory: true },
        { role: "assistant", content: "Feito.", fromHistory: true },
      ],
      { isStreaming: true },
    );
    expect(panel.textContent).toContain("Conversa anterior");
    expect(panel.querySelector('[data-testid="chat-progress"]')?.textContent).toContain("A ler o documento…");
    // History replies are not rated again.
    expect(panel.querySelector('button[aria-label="Resposta útil"]')).toBeNull();
  });
});
