// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? [key, ...Object.values(values)].join("|") : key,
}));
vi.mock("@/services/api/check-in.service", () => ({ checkInService: { getOutcomes: vi.fn() } }));

import { checkInService } from "@/services/api/check-in.service";
import type { CheckInOutcome } from "@/shared/types/check-in";
import { CheckInOutcomeStep } from "./CheckInChoices";

const LONG = "Identificar os vários tipos de ligação química e relacioná-los com classes de materiais. ".repeat(12);
const fourteen: CheckInOutcome[] = Array.from({ length: 14 }, (_, i) => ({
  id: `o${i}`,
  text: i === 0 ? LONG : `Aprendizagem ${i} sobre hidrocarbonetos`,
  topicPath: ["Ligação química"],
  source: "ai",
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

async function mount(props: Partial<Parameters<typeof CheckInOutcomeStep>[0]> = {}) {
  await act(async () => {
    root.render(
      createElement(CheckInOutcomeStep, {
        question: "uncoveredQuestion",
        result: "PARTIAL",
        outcomes: fourteen,
        selected: [],
        onToggle: vi.fn(),
        onSave: vi.fn(),
        onBack: vi.fn(),
        ...props,
      }),
    );
  });
}

const cards = () => container.querySelectorAll("li label");
const text = () => container.textContent ?? "";

/** Sets a field's value the way React notices, as typing does. */
function typeInto(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  return act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
describe("CheckInOutcomeStep with many outcomes", () => {
  it("shows six cards, a search box and 'Ver mais 8', then all fourteen", async () => {
    await mount();
    expect(cards()).toHaveLength(6);
    expect(container.querySelector('input[type="search"]')).not.toBeNull();
    const more = [...container.querySelectorAll("button")].find((b) => b.textContent === "outcomesShowMore|8");
    expect(more).toBeDefined();

    await act(async () => more?.click());

    expect(cards()).toHaveLength(14);
    expect(text()).not.toContain("outcomesShowMore");
  });

  it("shows a long text in full, wrapping instead of cutting it", async () => {
    await mount();
    const first = cards()[0];
    expect(first.textContent).toContain(LONG);
    expect(first.querySelector("[class*='line-clamp'], .truncate")).toBeNull();
    expect(first.innerHTML).toContain("[overflow-wrap:anywhere]");
  });

  it("filters by the search text, ignoring accents, and says when nothing matches", async () => {
    await mount();
    const search = container.querySelector('input[type="search"]') as HTMLInputElement;

    await typeInto(search, "LIGACAO QUIMICA E");
    expect(cards()).toHaveLength(1);

    await typeInto(search, "nada disto");
    expect(cards()).toHaveLength(0);
    expect(text()).toContain("outcomeSearchEmpty|nada disto");
  });

  it("has no search box with six outcomes or fewer", async () => {
    await mount({ outcomes: fourteen.slice(0, 6) });
    expect(cards()).toHaveLength(6);
    expect(container.querySelector('input[type="search"]')).toBeNull();
    expect(text()).not.toContain("outcomesShowMore");
  });
});

describe("CheckInOutcomeStep fallback outcomes (ENG-424)", () => {
  const lesson = { timetableId: "tt", slotId: "s1" };

  it("loads the plan unit's outcomes for a lesson with none and says where they come from", async () => {
    vi.mocked(checkInService.getOutcomes).mockResolvedValue({ source: "unit", outcomes: fourteen.slice(0, 2) });
    await mount({ outcomes: [], lesson });
    expect(checkInService.getOutcomes).toHaveBeenCalledWith("tt", "s1");
    expect(cards()).toHaveLength(2);
    expect(text()).toContain("outcomesFromUnit");
    expect(text()).toContain("uncoveredQuestion");
  });

  it("says when they come from the catalogue", async () => {
    vi.mocked(checkInService.getOutcomes).mockResolvedValue({ source: "catalogue", outcomes: fourteen.slice(0, 1) });
    await mount({ outcomes: [], lesson, result: "TAUGHT_WITH_DIFFICULTIES", question: "difficultiesQuestion" });
    expect(text()).toContain("outcomesFromCatalogue");
    expect(text()).toContain("difficultiesQuestion");
  });

  it("does not ask the server, nor show the hint, when the lesson has its own outcomes", async () => {
    await mount({ lesson });
    expect(checkInService.getOutcomes).not.toHaveBeenCalled();
    expect(text()).not.toContain("outcomesFrom");
  });

  it("shows the question with a loader and placeholder cards while the outcomes load", async () => {
    let resolve: (value: Awaited<ReturnType<typeof checkInService.getOutcomes>>) => void = () => undefined;
    vi.mocked(checkInService.getOutcomes).mockReturnValue(new Promise((done) => (resolve = done)));
    await mount({ outcomes: [], lesson });
    expect(text()).toContain("uncoveredQuestion");
    expect(container.querySelector("[role=status]")?.textContent).toBe("outcomesLoading");
    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(3);
    expect(cards()).toHaveLength(0);

    await act(async () => resolve({ source: "unit", outcomes: fourteen.slice(0, 2) }));
    expect(text()).not.toContain("outcomesLoading");
    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(0);
    expect(cards()).toHaveLength(2);
  });

  it("keeps only the amount and the note when nothing comes back, or the server does not know the request", async () => {
    vi.mocked(checkInService.getOutcomes).mockRejectedValue(new Error("404"));
    await mount({ outcomes: [], lesson });
    expect(text()).not.toContain("outcomesLoading");
    expect(cards()).toHaveLength(0);
    expect(text()).not.toContain("uncoveredQuestion");
    expect(text()).toContain("missingAmountQuestion");
    expect(text()).toContain("noteLabel");
  });
});

describe("CheckInOutcomeStep note", () => {
  it("counts the note's characters as they are typed, up to 500", async () => {
    await mount({ outcomes: [] });
    const note = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(note.getAttribute("maxlength")).toBe("500");
    expect(text()).toContain("0/500");
    await typeInto(note, "Faltou a revisão");
    expect(text()).toContain("16/500");
  });

  it("ends the step with Voltar and Guardar, not pinned over the content", async () => {
    await mount();
    const step = container.firstElementChild as HTMLElement;
    expect(step.lastElementChild?.textContent).toBe("backsave");
    expect(container.querySelector(".sticky")).toBeNull();
  });
});
