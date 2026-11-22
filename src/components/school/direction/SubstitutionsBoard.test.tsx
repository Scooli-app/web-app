// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/pt-PT.json";
import type { DirectionSubstitution } from "@/shared/types/school-direction";
import { SubstitutionsBoard } from "./SubstitutionsBoard";

const api = vi.hoisted(() => ({
  getDirectionSubstitutions: vi.fn(),
  registerDirectionSubstitution: vi.fn(),
  deleteDirectionSubstitution: vi.fn(),
}));
vi.mock("@/services/api/school-direction.service", () => api);

const members = [
  { userId: "u-ana", membershipId: "m1", name: "Ana Costa", email: "ana@aevale.example", status: "active" },
  { userId: "u-rui", membershipId: "m2", name: "Rui Alves", email: "rui@aevale.example", status: "active" },
];
vi.mock("@/store/hooks", () => ({
  useAppDispatch: () => () => undefined,
  // The board reads the members and the members' load error from the store.
  useAppSelector: (selector: { name?: string }) => (selector.name === "selectWorkspaceMembers" ? members : null),
}));
vi.mock("@/store/workspace/selectors", () => ({
  selectWorkspaceMembers: function selectWorkspaceMembers() {
    return members;
  },
  selectWorkspaceError: function selectWorkspaceError() {
    return null;
  },
}));
vi.mock("@/store/workspace/workspaceSlice", () => ({ fetchOrganizationMembers: () => ({ type: "noop" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const substitution = (over: Partial<DirectionSubstitution> = {}): DirectionSubstitution => ({
  id: "s1",
  date: "2026-11-23",
  absent: { userId: "u-ana", name: "Ana Costa", email: "ana@aevale.example" },
  substitute: { userId: "u-rui", name: "Rui Alves", email: "rui@aevale.example" },
  lessons: [
    {
      slotId: "slot-1",
      turmaId: "t1",
      grade: 8,
      classLabel: "B",
      subjectLabel: "Geography",
      sequenceNumber: 30,
      topicTitle: "Atividades económicas",
      lastLesson: null,
      history: [{ date: "2026-11-16", topicTitle: "Produção", teachingStatus: "partially_taught", note: "Faltou o mapa" }],
      documents: [{ title: "Plano de aula", documentType: "lesson_plan" }],
    },
  ],
  ...over,
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
  vi.clearAllMocks();
});

async function renderBoard() {
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <SubstitutionsBoard />
      </NextIntlClientProvider>,
    );
  });
  await act(() => new Promise((r) => setTimeout(r, 0)));
}

const text = () => document.body.textContent ?? "";
const button = (label: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;

describe("SubstitutionsBoard", () => {
  it("lists the stored absences with the class history and who sees it", async () => {
    api.getDirectionSubstitutions.mockResolvedValue([substitution()]);
    await renderBoard();

    expect(text()).toContain("Ana Costa");
    expect(text()).toContain("Faltou o mapa");
    expect(text()).toContain("Na agenda de Rui Alves");
    // No fake "send" any more.
    expect(text()).not.toContain("Enviar a");
  });

  it("marks an absence on a day without lessons as such, not as covered", async () => {
    api.getDirectionSubstitutions.mockResolvedValue([substitution({ lessons: [] })]);
    await renderBoard();

    expect(text()).toContain(messages.schoolDirection.substitutions.noLessonsPill);
    expect(text()).not.toContain(messages.schoolDirection.substitutions.covered);
  });

  it("removes an absence after confirming", async () => {
    api.getDirectionSubstitutions.mockResolvedValue([substitution()]);
    api.deleteDirectionSubstitution.mockResolvedValue(undefined);
    await renderBoard();

    await act(async () => button(messages.schoolDirection.substitutions.remove).click());
    const confirm = [...document.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === messages.schoolDirection.substitutions.remove,
    ) as HTMLButtonElement;
    await act(async () => confirm.click());

    expect(api.deleteDirectionSubstitution).toHaveBeenCalledWith("s1");
    expect(text()).toContain(messages.schoolDirection.substitutions.emptyAbsences);
  });

  it("says so when the absences cannot be loaded", async () => {
    api.getDirectionSubstitutions.mockRejectedValue(new Error("offline"));
    await renderBoard();

    expect(api.getDirectionSubstitutions).toHaveBeenCalled();
    expect(text()).not.toContain("Ana Costa");
  });
});
