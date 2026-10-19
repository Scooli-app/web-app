import type { CheckInCardItem } from "@/components/check-in/CheckInCard";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CheckInCard } from "./CheckInCard";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const item: CheckInCardItem = {
  slotDate: "2026-10-15",
  slotType: "LESSON",
  turmaTitle: "9.º A",
  subject: "PORTUGUESE",
  topicTitle: null,
  outcomes: [],
};

function render(props: { onSkip?: () => void; onCancel?: () => void; item?: CheckInCardItem }) {
  return renderToStaticMarkup(
    createElement(CheckInCard, {
      item: props.item ?? item,
      locale: "pt-PT",
      onSubmit: vi.fn(),
      onSkip: props.onSkip,
      onCancel: props.onCancel,
    }),
  );
}

describe("CheckInCard", () => {
  it("offers the four results", () => {
    const html = render({});
    expect(html).toContain("resultTaught");
    expect(html).toContain("resultNotHeld");
  });

  it("shows no cancel button unless the caller passes onCancel", () => {
    expect(render({})).not.toContain(">cancel</button>");
    expect(render({ onCancel: vi.fn() })).toContain(">cancel</button>");
  });

  it("shows the not-yet button for a test only when the caller passes onSkip", () => {
    const test = { ...item, slotType: "ASSESSMENT" as const };
    expect(render({ item: test })).not.toContain("assessmentNotYet");
    expect(render({ item: test, onSkip: vi.fn() })).toContain("assessmentNotYet");
  });
});
