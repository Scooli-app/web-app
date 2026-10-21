import type { MyWeekLessonDocument } from "@/shared/types/my-week";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LessonDocumentChips } from "./LessonDocumentChips";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => vi.fn(), useAppSelector: () => false }));
vi.mock("@/store/features/selectors", () => ({
  selectIsPresentationCreationEnabled: () => false,
  selectIsWorksheetCreationEnabled: () => false,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: vi.fn() }) }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), captureException: vi.fn() } }));
vi.mock("@/services/api/timetable.service", () => ({ generateLesson: vi.fn(), generateLessonDocument: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

function render(documents: MyWeekLessonDocument[]) {
  return renderToStaticMarkup(
    createElement(LessonDocumentChips, {
      timetableId: "tt",
      lesson: { id: "s1", slotType: "LESSON", documents },
      onChanged: () => undefined,
    }),
  );
}

const lessonPlan: MyWeekLessonDocument = {
  id: "d1",
  role: "lessonPlan",
  documentType: "lessonPlan",
  title: "Plano",
  status: "completed",
};

describe("LessonDocumentChips: pending suggestion dot", () => {
  it("shows a dot with the suggestion tooltip on a document that has a pending suggestion", () => {
    const html = render([{ ...lessonPlan, hasPendingSuggestion: true }]);

    expect(html).toContain('data-testid="pending-suggestion-dot"');
    expect(html).toContain("chip.suggestionDot");
  });

  it("shows no dot when the document has no pending suggestion", () => {
    const html = render([{ ...lessonPlan, hasPendingSuggestion: false }]);

    expect(html).not.toContain("pending-suggestion-dot");
  });
});
