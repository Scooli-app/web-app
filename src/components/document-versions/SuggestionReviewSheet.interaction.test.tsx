// @vitest-environment jsdom
import { ApiRequestError } from "@/services/api/client";
import { applySuggestion, getSuggestionDiff, refreshSuggestion, rejectSuggestion } from "@/services/api/document-versions.service";
import type { DocumentVersionDiff, PendingSuggestion } from "@/shared/types/document-suggestions";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuggestionReviewSheet } from "./SuggestionReviewSheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Radix checkboxes observe their size; jsdom does not implement ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
} as unknown as typeof ResizeObserver;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  useLocale: () => "pt-PT",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/api/document-versions.service", () => ({
  getSuggestionDiff: vi.fn(),
  applySuggestion: vi.fn(),
  refreshSuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
}));
vi.mock("@/components/document-editor-v2/SlideThumbnail", () => ({ SlideThumbnail: () => null }));

const SUGGESTION: PendingSuggestion = {
  versionId: "v1",
  createdAt: "2026-10-21T10:00:00Z",
  reason: { summary: "Resumo da sugestão." },
  stale: false,
  status: "ready",
};

const DIFF: DocumentVersionDiff = {
  stale: false,
  changes: [
    { key: "objetivos", type: "changed", title: "Objetivos", before: "Antes.", after: "Depois.", position: 1 },
  ],
};

let container: HTMLDivElement;
let root: Root;

function buttonWithText(text: string): HTMLButtonElement {
  const match = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim().startsWith(text),
  );
  if (!match) throw new Error(`No button starting with "${text}"`);
  return match;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function openSheet(onRefreshed = vi.fn()) {
  await act(async () => {
    root.render(
      createElement(SuggestionReviewSheet, {
        open: true,
        onOpenChange: () => undefined,
        documentId: "d1",
        suggestion: SUGGESTION,
        contentFormat: "json",
        onApplied: () => undefined,
        onRejected: () => undefined,
        onRefreshed,
      }),
    );
  });
  await flush();
  return onRefreshed;
}

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SuggestionReviewSheet: format changed", () => {
  it("shows the format alert and a refresh button when the diff reports a format change", async () => {
    vi.mocked(getSuggestionDiff).mockResolvedValue({ ...DIFF, formatChanged: true });

    await openSheet();

    expect(document.body.textContent).toContain("formatChanged");
    expect(buttonWithText("refresh")).toBeTruthy();
    expect(buttonWithText("apply").disabled).toBe(true);
  });

  it("calls refresh and hands over to the caller when Atualizar sugestão is pressed", async () => {
    vi.mocked(getSuggestionDiff).mockResolvedValue({ ...DIFF, formatChanged: true });
    vi.mocked(refreshSuggestion).mockResolvedValue(undefined);
    const onRefreshed = await openSheet();

    await act(async () => {
      buttonWithText("refresh").click();
    });
    await flush();

    expect(refreshSuggestion).toHaveBeenCalledWith("d1", "v1");
    expect(onRefreshed).toHaveBeenCalledTimes(1);
  });

  it("shows the format alert when apply answers 409 format_changed", async () => {
    vi.mocked(getSuggestionDiff).mockResolvedValue(DIFF);
    vi.mocked(applySuggestion).mockRejectedValue(new ApiRequestError("format changed", 409, "format_changed"));
    await openSheet();
    expect(document.body.textContent).not.toContain("formatChanged");

    await act(async () => {
      buttonWithText("apply").click();
    });
    await flush();

    expect(applySuggestion).toHaveBeenCalledWith("d1", "v1", null);
    expect(document.body.textContent).toContain("formatChanged");
    expect(buttonWithText("refresh")).toBeTruthy();
  });

  it("does not show the format alert for other apply failures", async () => {
    vi.mocked(getSuggestionDiff).mockResolvedValue(DIFF);
    vi.mocked(applySuggestion).mockRejectedValue(new ApiRequestError("boom", 500, null));
    await openSheet();

    await act(async () => {
      buttonWithText("apply").click();
    });
    await flush();

    expect(document.body.textContent).not.toContain("formatChanged");
  });

  // Audit: two "Atualizar sugestão" buttons, one per notice, and no way to tell them apart.
  it("shows one notice and one refresh button when the deck changed format and was edited", async () => {
    vi.mocked(getSuggestionDiff).mockResolvedValue({ ...DIFF, formatChanged: true, stale: true });

    await openSheet();

    const refreshButtons = Array.from(document.body.querySelectorAll("button")).filter((b) => b.textContent === "refresh");
    expect(refreshButtons).toHaveLength(1);
    expect(document.body.textContent).toContain("formatChanged");
    expect(document.body.textContent).not.toContain("staleNotice");
  });

  it("does not call refresh when no change of format was reported", async () => {
    vi.mocked(getSuggestionDiff).mockResolvedValue(DIFF);
    await openSheet();

    expect(document.body.textContent).not.toContain("formatChanged");
    expect(refreshSuggestion).not.toHaveBeenCalled();
    expect(rejectSuggestion).not.toHaveBeenCalled();
  });
});
