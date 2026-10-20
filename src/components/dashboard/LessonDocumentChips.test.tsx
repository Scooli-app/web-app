import type { MyWeekLessonDocument } from "@/shared/types/my-week";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LessonDocumentChips } from "./LessonDocumentChips";

const state = vi.hoisted(() => ({ worksheetOn: true }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => vi.fn(), useAppSelector: () => state.worksheetOn }));
vi.mock("@/store/features/selectors", () => ({
  selectIsPresentationCreationEnabled: () => false,
  selectIsWorksheetCreationEnabled: () => state.worksheetOn,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: vi.fn() }) }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), captureException: vi.fn() } }));
vi.mock("@/services/api/timetable.service", () => ({ generateLesson: vi.fn(), generateLessonDocument: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

function doc(over: Partial<MyWeekLessonDocument>): MyWeekLessonDocument {
  return {
    id: "d1",
    role: "worksheet",
    documentType: "worksheet",
    title: "Ficha",
    status: "completed",
    ...over,
  } as MyWeekLessonDocument;
}

function render(documents: MyWeekLessonDocument[]) {
  return renderToStaticMarkup(
    createElement(LessonDocumentChips, {
      timetableId: "tt",
      lesson: { id: "s1", slotType: "LESSON", documents },
      onChanged: () => undefined,
    }),
  );
}

/** The chip of a document: its label and the icon it carries. */
function chipsOf(html: string): string[] {
  return html.split("<a ").slice(1);
}

describe("LessonDocumentChips: reinforcement worksheets", () => {
  beforeEach(() => {
    state.worksheetOn = true;
  });

  it("gives a reinforcement worksheet its own rose chip with a target and the Reforço label", () => {
    const html = render([doc({ id: "r1", role: "reinforcement", documentType: "worksheet" })]);
    const [chip] = chipsOf(html);

    expect(chip).toContain("lucide-target");
    expect(chip).toContain("bg-rose-500/10");
    expect(chip).toContain("types.reinforcement");
    expect(chip).not.toContain("lucide-check");
  });

  it("keeps a normal worksheet as its own chip next to the reinforcement one", () => {
    const html = render([
      doc({ id: "w1", role: "worksheet" }),
      doc({ id: "r1", role: "reinforcement" }),
    ]);
    const [worksheet, reinforcement] = chipsOf(html);

    expect(chipsOf(html)).toHaveLength(2);
    expect(worksheet).toContain("lucide-check");
    expect(worksheet).toContain("types.worksheet");
    expect(reinforcement).toContain("lucide-target");
  });

  it("still offers a normal worksheet to create when only a reinforcement one exists", () => {
    const html = render([doc({ id: "r1", role: "reinforcement" })]);

    // The reinforcement chip is the done document; "Ficha" is still a dashed add chip.
    expect(html).toContain("border-dashed");
    expect(html).toContain("types.worksheet");
  });
});
