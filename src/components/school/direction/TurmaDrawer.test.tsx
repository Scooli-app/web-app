// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/pt-PT.json";
import type { DirectionTurmaDetail } from "@/shared/types/school-direction";
import { TurmaDrawer } from "./TurmaDrawer";

const api = vi.hoisted(() => ({ getDirectionTurma: vi.fn() }));
vi.mock("@/services/api/school-direction.service", () => api);
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const LONG_TITLE = "T".repeat(255);
const LONG_NOTE = "N".repeat(500);
const EMAIL = "maria.conceicao.figueiredo.sampaio@agrupamento-afonso-de-paiva.edu.pt";

// The backend's limits: 10 missed lessons, 255-character titles, 500-character notes; and 8 topics behind.
const maxDetail: DirectionTurmaDetail = {
  turma: {
    id: "t1",
    title: "2.º A",
    grade: 2,
    classLabel: "A",
    subjectKey: "Portuguese",
    subjectLabel: "Portuguese",
    department: "languages",
    state: "behind",
    executionPercent: 71,
    lessonsPast: 40,
    lessonsBehind: 12,
    behindTopic: "Tópico 0",
    teacher: { userId: "u1", name: "Maria da Conceição Albuquerque Figueiredo Sampaio", email: EMAIL },
  },
  missedLessons: Array.from({ length: 10 }, (_, i) => ({
    slotId: `s${i}`,
    date: `2026-10-${String(28 - i * 2).padStart(2, "0")}`,
    sequenceNumber: 30 - i,
    topicTitle: i === 0 ? LONG_TITLE : `Aula ${i}`,
    teachingStatus: i % 3 === 1 ? ("not_held" as const) : ("partially_taught" as const),
    note: i === 0 ? LONG_NOTE : i % 3 === 1 ? "Visita de estudo" : null,
  })),
  behindTopics: Array.from({ length: 8 }, (_, i) => ({
    label: `Tópico ${i}`,
    plannedDate: "2026-10-20",
    lessonsBehind: i === 1 ? 0 : 1,
  })),
  difficulties: [],
  teacherPlan: { status: "accepted", summary: "Ficou por dar a parte das estruturas.", createdAt: "2026-11-17", decidedAt: "2026-11-17" },
  nextAssessment: { date: "2026-11-26", topicTitle: "Teste 1" },
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

async function renderDrawer(detail: DirectionTurmaDetail) {
  api.getDirectionTurma.mockResolvedValue(detail);
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <TurmaDrawer turmaId="t1" onClose={() => undefined} />
      </NextIntlClientProvider>,
    );
  });
}

const button = (text: string) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
const timelineItems = () => document.body.querySelectorAll("ol > li");

describe("TurmaDrawer at the backend's limits", () => {
  it("shows the KPIs, 4 lessons of the timeline and 'Ver mais 6' that opens the rest", async () => {
    await renderDrawer(maxDetail);
    const text = document.body.textContent ?? "";
    expect(text).toContain("12aulas em atraso");
    expect(text).toContain("10aulas com problemas");
    expect(timelineItems()).toHaveLength(4);

    const more = button("Ver mais 6");
    expect(more?.getAttribute("aria-expanded")).toBe("false");
    await act(async () => more?.click());
    expect(timelineItems()).toHaveLength(10);
  });

  it("clamps the long title with its full text in the title, and the long note behind 'Ler tudo'", async () => {
    await renderDrawer(maxDetail);
    const title = document.body.querySelector(`[title="${LONG_TITLE}"]`);
    expect(title?.className).toContain("line-clamp-2");
    const note = [...document.body.querySelectorAll("p")].find((p) => p.textContent?.includes(LONG_NOTE));
    expect(note?.className).toContain("line-clamp-3");
    await act(async () => button("Ler tudo")?.click());
    expect(note?.className).not.toContain("line-clamp-3");
    // Only the long note had a "Ler tudo"; the short ones are never clamped.
    expect(button("Ler tudo")).toBeUndefined();
  });

  it("shows 5 topics behind and +3, keeping 'parte por dar' on a topic with no whole lesson behind", async () => {
    await renderDrawer(maxDetail);
    const chips = [...document.body.querySelectorAll<HTMLLIElement>("li[title]")].filter((li) => li.title.startsWith("Tópico"));
    expect(chips).toHaveLength(5);
    expect(chips[1].textContent).toContain("parte por dar");
    await act(async () => button("+3")?.click());
    expect([...document.body.querySelectorAll<HTMLLIElement>("li[title]")].filter((li) => li.title.startsWith("Tópico"))).toHaveLength(8);
  });

  it("copies the teacher's email and says so, or says it could not", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await renderDrawer(maxDetail);
    await act(async () => button("Copiar email")?.click());
    expect(writeText).toHaveBeenCalledWith(EMAIL);
    expect(toast.success).toHaveBeenCalledWith("Email copiado");

    writeText.mockRejectedValueOnce(new Error("denied"));
    await act(async () => button("Copiar email")?.click());
    expect(toast.error).toHaveBeenCalled();
  });

  it("keeps the plan adjustment folded, with the summary quoted", async () => {
    await renderDrawer(maxDetail);
    const details = document.body.querySelector("details");
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain("“Ficou por dar a parte das estruturas.”");
    expect(details?.textContent).toContain("O que a Scooli disse ao professor");
  });
});
