import { describe, expect, it, vi } from "vitest";
import { shouldAutoOpenReview } from "./SuggestionBar";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "pt-PT" }));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => vi.fn() }));
vi.mock("@/store/documents/documentSlice", () => ({ setCurrentDocument: (payload: unknown) => payload }));
vi.mock("@/services/api/document.service", () => ({ getDocument: vi.fn() }));
vi.mock("@/services/api/document-versions.service", () => ({
  getSuggestionDiff: vi.fn(),
  applySuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/document-editor-v2/SlideThumbnail", () => ({ SlideThumbnail: () => null }));

const ready = { autoOpenReview: true, alreadyOpened: false, generating: false, status: "ready" as const };

describe("shouldAutoOpenReview", () => {
  it("opens the review when asked from Por rever and the suggestion is ready", () => {
    expect(shouldAutoOpenReview(ready)).toBe(true);
  });

  it("stays closed without ?review=1", () => {
    expect(shouldAutoOpenReview({ ...ready, autoOpenReview: false })).toBe(false);
  });

  it("waits while the suggestion is still being written", () => {
    expect(shouldAutoOpenReview({ ...ready, generating: true, status: "generating" })).toBe(false);
  });

  it("opens only once per editor", () => {
    expect(shouldAutoOpenReview({ ...ready, alreadyOpened: true })).toBe(false);
  });

  it("needs a suggestion to exist", () => {
    expect(shouldAutoOpenReview({ ...ready, status: undefined })).toBe(false);
  });
});
