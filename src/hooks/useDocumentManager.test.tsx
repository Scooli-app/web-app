// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type DocumentsState = { currentDocument: { id: string; content: string } | null; isLoading: boolean; isSaving: boolean };

const state = vi.hoisted(() => ({
  documents: { currentDocument: null, isLoading: false, isSaving: false } as DocumentsState,
  dispatch: vi.fn(),
}));
vi.mock("@/store/hooks", () => ({
  useAppDispatch: () => state.dispatch,
  useAppSelector: (select: (s: { documents: DocumentsState }) => unknown) => select({ documents: state.documents }),
  selectCurrentDocument: (s: { documents: DocumentsState }) => s.documents.currentDocument,
  selectIsLoading: (s: { documents: DocumentsState }) => s.documents.isLoading,
}));
vi.mock("@/store/documents/documentSlice", () => ({
  fetchDocument: (id: string) => ({ type: "documents/fetchDocument", meta: { arg: id } }),
  updateDocument: vi.fn(),
  updateDocumentOptimistic: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useDocumentManager } from "./useDocumentManager";

let root: Root;

function Probe({ documentId }: { documentId: string }) {
  useDocumentManager(documentId);
  return null;
}

function render(documentId: string) {
  act(() => root.render(createElement(Probe, { documentId })));
}

function fetchesFor(id: string) {
  return state.dispatch.mock.calls.filter(([action]) => action.meta?.arg === id).length;
}

beforeEach(() => {
  state.documents = { currentDocument: null, isLoading: false, isSaving: false };
  state.dispatch.mockReset();
  root = createRoot(document.createElement("div"));
});

afterEach(() => {
  act(() => root.unmount());
});

describe("useDocumentManager fetch", () => {
  it("fetches the route document once while it is not in the store", () => {
    state.documents.currentDocument = { id: "previous", content: "" };
    render("route");
    render("route");
    expect(fetchesFor("route")).toBe(1);
  });

  it("fetches the route document again when another document replaces it in the store", () => {
    state.documents.currentDocument = { id: "route", content: "" };
    render("route");
    expect(fetchesFor("route")).toBe(0);
    state.documents.currentDocument = { id: "other", content: "" };
    render("route");
    expect(fetchesFor("route")).toBe(1);
  });
});
