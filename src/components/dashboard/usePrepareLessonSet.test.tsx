// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpgradeLimitError } from "@/services/api/client";
import { LessonDocumentChips } from "./LessonDocumentChips";
import { usePrepareLessonSet } from "./usePrepareLessonSet";

const api = vi.hoisted(() => ({ generateLesson: vi.fn(), generateLessonDocument: vi.fn() }));
vi.mock("@/services/api/timetable.service", () => api);
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => vi.fn(), useAppSelector: (selector: () => unknown) => selector() }));
vi.mock("@/store/features/selectors", () => ({
  selectIsPresentationCreationEnabled: () => true,
  selectIsWorksheetCreationEnabled: () => true,
}));
vi.mock("@/store/entitlements/selectors", () => ({ selectHasEffectivePro: () => true }));
vi.mock("@/hooks/useAccountAccess", () => ({
  useAccountAccess: () => ({ guard: () => true, hasCredits: false, isLocked: false }),
}));
vi.mock("@/hooks/usePlanLimits", () => ({ usePlanLimits: () => ({ limits: null }), invalidatePlanLimits: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: vi.fn() }) }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), captureException: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

let plan = deferred();

/** The lesson pop-up's wiring: the hook's run states feed the chips. */
function Harness() {
  const { sets, prepare, runStates } = usePrepareLessonSet({
    timetableId: "tt",
    lessonId: "s1",
    slotDate: "2026-11-23",
    slotType: "LESSON",
    subject: "Mathematics",
    documents: [],
    ready: true,
    generatePlan: () => plan.promise,
    onDone: () => undefined,
    surface: "lesson_popup",
  });
  return (
    <div>
      {sets.map((set) => (
        <button key={set.types.join()} type="button" data-set={set.types.join()} onClick={() => void prepare(set.types)}>
          {set.label}
        </button>
      ))}
      <LessonDocumentChips
        timetableId="tt"
        lesson={{ id: "s1", slotType: "LESSON", documents: [] }}
        onChanged={() => undefined}
        planAsChip
        runStates={runStates}
      />
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  plan = deferred();
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

/** Each chip's text: "types.quiz · docState.waiting" while it runs, "types.quiz" when it can be added. */
const chipTexts = () => [...container.querySelectorAll("span.rounded-full, button.rounded-full")].map((el) => el.textContent);

describe("Preparing a lesson set: each document shows its own state", () => {
  it("offers the suggestion, every missing document and the plan alone", async () => {
    await act(async () => root.render(<Harness />));
    expect([...container.querySelectorAll("[data-set]")].map((b) => b.getAttribute("data-set"))).toEqual([
      "lessonPlan,worksheet",
      "lessonPlan,worksheet,quiz,presentation",
      "lessonPlan",
    ]);
  });

  it("writes the plan, keeps the others waiting on it, then generates them; a failure stays on its own chip", async () => {
    const worksheetStart = deferred();
    api.generateLessonDocument.mockImplementation((_tt: string, _lesson: string, type: string) => {
      if (type === "worksheet") return worksheetStart.promise;
      if (type === "quiz") return Promise.reject(new Error("boom"));
      return Promise.resolve();
    });
    await act(async () => root.render(<Harness />));
    await act(async () =>
      (container.querySelector('[data-set="lessonPlan,worksheet,quiz,presentation"]') as HTMLButtonElement).click(),
    );

    expect(chipTexts()).toEqual([
      "types.lessonPlan · docState.writing",
      "types.worksheet · docState.waiting",
      "types.quiz · docState.waiting",
      "types.presentation · docState.waiting",
    ]);
    expect(api.generateLessonDocument).not.toHaveBeenCalled(); // the companions are written from the plan

    await act(async () => plan.resolve());
    expect(chipTexts()).toEqual([
      "types.lessonPlan",
      "types.worksheet · docState.generating",
      "types.quiz · docState.generating",
      "types.presentation · docState.generating",
    ]);

    await act(async () => worksheetStart.resolve());
    const texts = chipTexts();
    expect(texts.filter((text) => text?.includes("docState.failed"))).toEqual([
      "types.quiz · docState.failed ·docState.retry",
    ]);
    expect(texts).not.toContain("types.presentation · docState.generating");

    // "Tentar de novo" starts that document only.
    api.generateLessonDocument.mockClear();
    api.generateLessonDocument.mockResolvedValue(undefined);
    const retry = [...container.querySelectorAll("button")].find((b) => b.textContent === "docState.retry");
    await act(async () => retry?.click());
    expect(api.generateLessonDocument).toHaveBeenCalledTimes(1);
    expect(api.generateLessonDocument.mock.calls[0][2]).toBe("quiz");
  });

  it("a document blocked by the plan limit goes back to its add chip, with no retry", async () => {
    api.generateLessonDocument.mockImplementation((_tt: string, _lesson: string, type: string) =>
      type === "quiz" ? Promise.reject(new UpgradeLimitError("no credits")) : Promise.resolve(),
    );
    await act(async () => root.render(<Harness />));
    await act(async () =>
      (container.querySelector('[data-set="lessonPlan,worksheet,quiz,presentation"]') as HTMLButtonElement).click(),
    );
    await act(async () => plan.resolve());

    expect(chipTexts().some((text) => text?.includes("docState.failed"))).toBe(false);
    expect(chipTexts()).toContain("types.quiz");
  });

  it("generates the companions at once when the plan is not part of the set", async () => {
    api.generateLessonDocument.mockReturnValue(new Promise(() => undefined));
    function NoPlan() {
      const { prepare, runStates } = usePrepareLessonSet({
        timetableId: "tt",
        lessonId: "s1",
        slotDate: "2026-11-23",
        slotType: "EXERCISE",
        subject: "Mathematics",
        documents: [],
        ready: true,
        generatePlan: () => plan.promise,
        onDone: () => undefined,
        surface: "lesson_popup",
      });
      return (
        <button type="button" data-run onClick={() => void prepare()}>
          {JSON.stringify(runStates)}
        </button>
      );
    }
    await act(async () => root.render(<NoPlan />));
    await act(async () => (container.querySelector("[data-run]") as HTMLButtonElement).click());
    expect(JSON.parse(container.querySelector("[data-run]")?.textContent ?? "{}")).toEqual({
      worksheet: "generating",
      quiz: "generating",
    });
  });
});
