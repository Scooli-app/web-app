import { PreviousLessonCheckInView } from "@/components/check-in/PreviousLessonCheckIn";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/store/hooks", () => ({ useAppSelector: (selector: () => unknown) => selector() }));
vi.mock("@/store/entitlements/selectors", () => ({ selectHasEffectivePro: () => true }));

/** The previous-lesson prompt after a "Não houve aula" answer: the same view for Pro and non-Pro, the flag decides the line. */
function renderAfterNotHeld(props: { shiftAsk?: boolean; replanning?: boolean }) {
  return renderToStaticMarkup(
    createElement(PreviousLessonCheckInView, {
      question: "question",
      saved: "saved",
      saveFailed: false,
      outcomeResult: null,
      outcomes: [],
      selected: [],
      onChoose: vi.fn(),
      onToggle: vi.fn(),
      onConfirm: vi.fn(),
      onBackOutcomes: vi.fn(),
      onNotNow: vi.fn(),
      onShift: vi.fn(),
      onKeep: vi.fn(),
      ...props,
    }),
  );
}

describe("after 'não houve aula' on the previous lesson", () => {
  it("non-Pro: keeps the offer to move the following lessons", () => {
    const html = renderAfterNotHeld({ shiftAsk: true, replanning: false });
    expect(html).toContain("shiftQuestion");
    expect(html).toContain("shiftAction");
    expect(html).not.toContain("notHeldInProgress");
  });

  it("Pro: shows that the lessons are being replanned instead of the move offer", () => {
    const html = renderAfterNotHeld({ shiftAsk: false, replanning: true });
    expect(html).toContain("notHeldInProgress");
    expect(html).not.toContain("shiftQuestion");
    expect(html).not.toContain("shiftAction");
  });

  it("a plain save with no decision shows only the saved line", () => {
    const html = renderAfterNotHeld({});
    expect(html).toContain("saved");
    expect(html).not.toContain("shiftQuestion");
    expect(html).not.toContain("notHeldInProgress");
  });
});
