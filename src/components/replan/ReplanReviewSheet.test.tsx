// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/pt-PT.json";
import type { ReplanItem, ReplanProposal } from "@/shared/types/replan";
import { ReplanReviewSheet } from "./ReplanReviewSheet";

const replan = vi.hoisted(() => ({ accept: vi.fn().mockResolvedValue({}), reject: vi.fn().mockResolvedValue({}) }));
vi.mock("@/services/api/replan.service", () => ({ replanService: replan }));
// Radix checkboxes observe their size; jsdom does not implement ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
} as unknown as typeof ResizeObserver;
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const item = (i: number, change: ReplanItem["change"]): ReplanItem => ({
  slotId: `slot-${i}`,
  date: `2026-12-${String(i + 1).padStart(2, "0")}`,
  sequenceNumber: 30 + i,
  change,
  before: { topicTitle: `Tema ${i - 1}`, outcomeTexts: ["Distinguir metais de não metais."] },
  after: {
    topicTitle: change === "reinforcement" ? `Tema ${i - 1}` : `Tema ${i}`,
    description: null,
    outcomeTexts: ["Distinguir metais de não metais.", "Relacionar a distribuição eletrónica com a Tabela Periódica."],
  },
  addition: change === "reinforcement" ? "exercício orientado" : null,
  reason: "Passa para a aula seguinte.",
  hasDocuments: i === 0,
});

// A lesson not held pushes the rest of the term: 2 reinforcements and 12 lessons that move on.
const proposal: ReplanProposal = {
  id: "p1",
  status: "pending",
  trigger: "not_held",
  triggerSlotId: "slot-x",
  summary: "A aula de 19/11 não foi dada, por isso as seguintes avançam e reforçam a distribuição eletrónica.",
  createdAt: "2026-11-20",
  items: Array.from({ length: 14 }, (_, i) => item(i, i < 2 ? "reinforcement" : "retitled")),
};

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
  vi.clearAllMocks();
});

async function renderSheet(p: ReplanProposal = proposal) {
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <ReplanReviewSheet timetableId="tt" proposal={p} open onOpenChange={() => undefined} onDecided={() => undefined} />
      </NextIntlClientProvider>,
    );
  });
}

const buttons = () => [...document.body.querySelectorAll("button")];
const byText = (text: string) => buttons().find((b) => b.textContent?.includes(text));
const applyButton = () => buttons().find((b) => b.textContent?.startsWith("Aplicar a"));
const selectAll = () => document.body.querySelector("label button[role=checkbox]") as HTMLButtonElement;

describe("ReplanReviewSheet with 14 lessons", () => {
  it("titles the action, groups the lessons with counts and starts the big group closed", async () => {
    await renderSheet();
    expect(document.body.textContent).toContain("Ajustar 14 aulas");
    const reinforcement = byText("Reforço");
    const retitled = byText("Novo tema12");
    expect(reinforcement?.getAttribute("aria-expanded")).toBe("true");
    expect(retitled?.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.querySelectorAll("ol > li")).toHaveLength(2);

    await act(async () => retitled?.click());
    expect(document.body.querySelectorAll("ol > li")).toHaveLength(14);
  });

  it("counts the checked lessons on the apply button and makes 'Todas' indeterminate when partial", async () => {
    await renderSheet();
    expect(applyButton()?.textContent).toBe("Aplicar a 14 aulas");
    expect(selectAll().getAttribute("data-state")).toBe("checked");

    const firstLesson = document.body.querySelector('button[aria-label="Aplicar a aula 30"]') as HTMLButtonElement;
    await act(async () => firstLesson.click());
    expect(applyButton()?.textContent).toBe("Aplicar a 13 aulas");
    expect(selectAll().getAttribute("data-state")).toBe("indeterminate");

    await act(async () => selectAll().click()); // partial → all
    expect(applyButton()?.textContent).toBe("Aplicar a 14 aulas");
    await act(async () => selectAll().click()); // all → none
    expect(applyButton()?.textContent).toBe("Aplicar a 0 aulas");
    expect(applyButton()?.disabled).toBe(true);
  });

  it("selects a lesson from a click anywhere on its card, not only the checkbox", async () => {
    await renderSheet();
    const title = [...document.body.querySelectorAll("li span[title]")].find((el) =>
      el.textContent?.startsWith("Aula 30"),
    ) as HTMLElement;
    await act(async () => title.click());
    expect(applyButton()?.textContent).toBe("Aplicar a 13 aulas");
    await act(async () => title.click());
    expect(applyButton()?.textContent).toBe("Aplicar a 14 aulas");
  });

  it("applies all with null, the way the backend reads 'every change'", async () => {
    await renderSheet();
    await act(async () => applyButton()?.click());
    expect(replan.accept).toHaveBeenCalledWith("tt", "p1", null);
  });

  it("applies only the checked lessons (partial acceptance)", async () => {
    await renderSheet();
    const firstLesson = document.body.querySelector('button[aria-label="Aplicar a aula 30"]') as HTMLButtonElement;
    await act(async () => firstLesson.click());
    await act(async () => applyButton()?.click());
    expect(replan.accept).toHaveBeenCalledWith(
      "tt",
      "p1",
      proposal.items.slice(1).map((i) => i.slotId),
    );
  });

  it("opens a lesson to its topic change, what changes and its outcomes, the new ones marked", async () => {
    await renderSheet();
    const chevron = document.body.querySelector('button[aria-label="Ver detalhes da aula 30"]') as HTMLButtonElement;
    expect(chevron.getAttribute("aria-expanded")).toBe("false");
    await act(async () => chevron.click());
    // Opening the details does not change the selection.
    expect(applyButton()?.textContent).toBe("Aplicar a 14 aulas");
    const details = document.body.querySelector("dl");
    expect(details?.textContent).toContain("mantém-se");
    expect(details?.textContent).toContain("Acrescenta: exercício orientadoPassa para a aula seguinte.");
    expect(details?.textContent).toContain("+ Novo");
    expect(details?.querySelectorAll('button[aria-label="Ver o texto completo"]')).toHaveLength(2);
  });

  it("labels a merged lesson with a new title as a merge, not as a new topic", async () => {
    const merged = item(3, "merged");
    await renderSheet({
      ...proposal,
      items: [{ ...merged, after: { ...merged.after, outcomeTexts: merged.before.outcomeTexts } }],
    });
    const row = document.body.querySelector("ol > li");
    expect(row?.textContent).toContain(messages.replan.changeMerged);
    expect(row?.textContent).not.toContain(messages.replan.changeRetitled);
  });

  it("opens the only lesson of a one-lesson proposal and hides 'Todas'", async () => {
    await renderSheet({ ...proposal, items: [item(0, "reinforcement")] });
    expect(document.body.textContent).toContain("Ajustar a próxima aula");
    expect(document.body.querySelector("dl")).not.toBeNull();
    expect(document.body.querySelector("label button[role=checkbox]")).toBeNull();
    expect(applyButton()?.textContent).toBe("Aplicar a 1 aula");
  });
});
