import { PreviousLessonCheckInView } from "@/components/check-in/PreviousLessonCheckIn";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

/** The previous-lesson prompt once its answer is saved: the saved line, then the one step line, if any. */
function renderSaved(step: string | null) {
  return renderToStaticMarkup(
    createElement(PreviousLessonCheckInView, {
      lessonName: "lesson",
      saved: "saved",
      step: step ? createElement("p", null, step) : null,
      saveFailed: false,
      outcomeResult: null,
      outcomes: [],
      selected: [],
      onChoose: vi.fn(),
      onToggle: vi.fn(),
      onConfirm: vi.fn(),
      onBackOutcomes: vi.fn(),
      onNotNow: vi.fn(),
    }),
  );
}

describe("the previous-lesson prompt after its answer", () => {
  it("shows the saved line and the one step under it", () => {
    const html = renderSaved("step-line");
    expect(html).toContain("saved");
    expect(html).toContain("step-line");
  });

  it("with nothing to decide, shows only the saved line", () => {
    const html = renderSaved(null);
    expect(html).toContain("saved");
    expect(html).not.toContain("step-line");
  });
});
