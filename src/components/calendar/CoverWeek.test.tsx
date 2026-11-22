// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/pt-PT.json";
import type { DirectionSubstitution } from "@/shared/types/school-direction";
import { CoverWeek } from "./CoverWeek";

const getMyCovers = vi.fn<(from: string, to: string) => Promise<DirectionSubstitution[]>>();
vi.mock("@/services/api/school-direction.service", () => ({ getMyCovers: (f: string, t: string) => getMyCovers(f, t) }));

const cover: DirectionSubstitution = {
  id: "s1",
  date: "2026-11-23",
  absent: { userId: "u-ana", name: "Ana Costa", email: "ana@aevale.example" },
  substitute: { userId: "u-me", name: "Rui Alves", email: "rui@aevale.example" },
  lessons: [
    {
      slotId: "slot-1",
      turmaId: "t1",
      grade: 8,
      classLabel: "B",
      subjectLabel: "Geography",
      sequenceNumber: 30,
      topicTitle: "Distribuição das atividades económicas",
      lastLesson: null,
      history: [
        { date: "2026-11-16", topicTitle: "Processos de produção", teachingStatus: "partially_taught", note: "Faltou o mapa da p. 42" },
        { date: "2026-11-13", topicTitle: "Setores de atividade", teachingStatus: "taught", note: null },
      ],
      documents: [],
    },
  ],
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
  getMyCovers.mockReset();
});

async function renderWeek() {
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <CoverWeek weekStart={new Date(2026, 10, 23)} />
      </NextIntlClientProvider>,
    );
  });
  await act(() => new Promise((r) => setTimeout(r, 0)));
}

describe("CoverWeek", () => {
  it("asks for the week and shows each covered lesson with whose class it is", async () => {
    getMyCovers.mockResolvedValue([cover]);
    await renderWeek();

    expect(getMyCovers).toHaveBeenCalledWith("2026-11-23", "2026-11-29");
    expect(document.body.textContent).toContain(messages.calendar.covers.title);
    expect(document.body.textContent).toContain("8.º B");
    expect(document.body.textContent).toContain("Ana Costa");
  });

  it("opens the class history, read-only", async () => {
    getMyCovers.mockResolvedValue([cover]);
    await renderWeek();

    await act(async () => container.querySelector<HTMLButtonElement>("li button")?.click());

    expect(document.body.textContent).toContain("Faltou o mapa da p. 42");
    expect(document.body.textContent).toContain("Setores de atividade");
    expect(document.body.textContent).toContain("ana@aevale.example");
  });

  it("shows nothing when there is nothing to cover or the request fails", async () => {
    getMyCovers.mockResolvedValue([]);
    await renderWeek();
    expect(container.textContent).toBe("");

    getMyCovers.mockRejectedValue(new Error("offline"));
    await renderWeek();
    expect(container.textContent).toBe("");
  });
});
