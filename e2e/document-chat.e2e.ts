import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";

/**
 * The document assistant end to end (ENG-385), against the e2e backend whose fake AI scripts each chat outcome
 * from the teacher's message (FakeAiClient#chatTurn in chalkboard): any request edits by appending
 * "Atividade extra (e2e)", "está fraquinha" asks to clarify, a question gets an answer.
 */

const ADDED = "Atividade extra (e2e)";

function chat(page: Page) {
  // Desktop: the side panel that holds the desktop chat input (the placeholder differs per document type).
  return page.locator("aside").filter({ has: page.locator('[data-chat-input="desktop"]') });
}

async function send(page: Page, text: string) {
  const panel = chat(page);
  const input = panel.locator('[data-chat-input="desktop"]');
  await input.fill(text);
  await input.press("Enter");
}

test.describe("assistente do documento", () => {
  let documentId: string;

  test.beforeEach(async ({ api }) => {
    documentId = await api.createLessonPlan("Frações no chat");
  });

  test.afterEach(async ({ api }) => {
    await api.deleteDocument(documentId).catch(() => undefined);
  });

  test("uma edição mostra o que mudou, só fica guardada depois de aceite, e a conversa volta ao reabrir", async ({
    page,
    api,
  }) => {
    await page.goto(`/lesson-plan/${documentId}`);
    const panel = chat(page);
    const before = (await api.getDocument(documentId)).content;

    await send(page, "acrescenta uma atividade de grupo");

    // The reply lists the change; the page is in suggestions mode.
    const reply = panel.getByTestId("chat-assistant-message").last();
    await expect(reply).toContainText("Acrescentei uma atividade extra.");
    await expect(reply.getByTestId("chat-change-list")).toContainText(`Novo: ${ADDED}`);
    await expect(page.getByText("✨ Modo Sugestões")).toBeVisible();

    // ENG-408: nothing is stored until the teacher accepts.
    expect((await api.getDocument(documentId)).content).toBe(before);

    await page.getByRole("button", { name: "✓ Aceitar todas" }).click();
    await expect.poll(async () => (await api.getDocument(documentId)).content, { timeout: 15_000 }).toContain(ADDED);
    await expect.poll(async () => (await api.getDocument(documentId)).metadata?.pendingAiEdit ?? null).toBeNull();

    // Follow-up chips come with the reply (ENG-405).
    await expect(reply.getByTestId("chat-follow-ups")).toContainText("Simplifica a linguagem");

    // ENG-396: the stored conversation is shown again after a reload.
    await page.reload();
    await expect(panel.getByText("Conversa anterior")).toBeVisible();
    await expect(panel.getByText("acrescenta uma atividade de grupo")).toBeVisible();
    await expect(panel.getByText("Acrescentei uma atividade extra.")).toBeVisible();

    // "Nova conversa" clears it for the assistant too.
    await panel.getByTestId("chat-new-conversation").click();
    await expect(panel.getByText("Acrescentei uma atividade extra.")).toHaveCount(0);
    await expect.poll(async () => (await api.getChatHistory(documentId)).messages.length).toBe(0);
  });

  test("um pedido vago leva a uma pergunta com opções, e uma pergunta não mexe no documento", async ({ page, api }) => {
    await page.goto(`/lesson-plan/${documentId}`);
    const panel = chat(page);
    const before = (await api.getDocument(documentId)).content;

    await send(page, "está fraquinha");
    const options = panel.getByTestId("chat-clarify-options");
    await expect(options.getByRole("button")).toHaveText(["Mais exercícios", "Exercícios mais difíceis"]);

    await send(page, "quantos objetivos tem a aula?");
    await expect(panel.getByTestId("chat-assistant-message").last()).toContainText("Resposta de teste.");
    await expect(page.getByText("✨ Modo Sugestões")).toHaveCount(0);
    expect((await api.getDocument(documentId)).content).toBe(before);
  });

  test("uma proposta não revista é oferecida outra vez ao reabrir, e rejeitar deixa o documento como estava", async ({
    page,
    api,
  }) => {
    await page.goto(`/lesson-plan/${documentId}`);
    const before = (await api.getDocument(documentId)).content;

    await send(page, "acrescenta uma atividade de grupo");
    await expect(page.getByText("✨ Modo Sugestões")).toBeVisible();

    // Leave without deciding (the reload answers the "leave?" prompt).
    page.once("dialog", (dialog) => dialog.accept());
    await page.reload();

    const banner = page.getByTestId("pending-ai-proposal");
    await expect(banner).toContainText("Tens alterações da IA por rever");
    await banner.getByRole("button", { name: "Rever" }).click();
    await expect(page.getByText("✨ Modo Sugestões")).toBeVisible();
    await page.getByRole("button", { name: "✗ Rejeitar todas" }).click();

    await expect.poll(async () => (await api.getDocument(documentId)).metadata?.pendingAiEdit ?? null).toBeNull();
    // The editor may save the same text back in its own markdown layout (blank lines, <br>, <!-- -->), so compare
    // what the document says, not how it is laid out.
    const after = (await api.getDocument(documentId)).content;
    expect(after).not.toContain(ADDED);
    expect(sameText(after)).toBe(sameText(before));
  });
});

/** The document's words, without markdown layout the editor adds when it saves. */
function sameText(markdown: string | null | undefined): string {
  return (markdown ?? "")
    .replace(/<!--\s*-->/g, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
