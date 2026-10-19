import type { PendingCheckIn } from "@/shared/types/check-in";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckInStrip } from "./CheckInStrip";

const state = vi.hoisted(() => ({
  enabled: true,
  visible: [] as unknown[],
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-PT",
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/store/hooks", () => ({ useAppSelector: () => state.enabled }));
vi.mock("@/store/features/selectors", () => ({ selectIsClassStateEnabled: () => state.enabled }));
vi.mock("@/hooks/usePendingCheckIns", () => ({
  usePendingCheckIns: () => ({
    visible: state.visible,
    dismissed: false,
    submit: async () => true,
    confirmAll: async () => 0,
    skipForSession: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

const lesson: PendingCheckIn = {
  timetableId: "t1",
  turmaTitle: "9.º A",
  subject: "PORTUGUESE",
  gradeLevel: 9,
  slotId: "s1",
  slotDate: "2026-10-15",
  slotType: "LESSON",
  sequenceNumber: 3,
  topicTitle: "Os Lusíadas",
  outcomes: [],
};

describe("CheckInStrip", () => {
  beforeEach(() => {
    state.enabled = true;
    state.visible = [lesson];
  });

  it("renders nothing with the class_state_enabled flag off", () => {
    state.enabled = false;
    expect(renderToStaticMarkup(createElement(CheckInStrip))).toBe("");
  });

  it("renders the pending card with the four results when the flag is on", () => {
    const html = renderToStaticMarkup(createElement(CheckInStrip));
    expect(html).toContain("pendingCount");
    expect(html).toContain("resultTaught");
    expect(html).toContain("resultDifficulties");
    expect(html).toContain("resultPartial");
    expect(html).toContain("resultNotHeld");
  });

  it("shows the test question and the not-yet button for an assessment", () => {
    state.visible = [{ ...lesson, slotType: "ASSESSMENT" }];
    const html = renderToStaticMarkup(createElement(CheckInStrip));
    expect(html).toContain("assessmentQuestion");
    expect(html).toContain("assessmentNotYet");
  });

  it("renders nothing when nothing is pending", () => {
    state.visible = [];
    expect(renderToStaticMarkup(createElement(CheckInStrip))).toBe("");
  });
});
