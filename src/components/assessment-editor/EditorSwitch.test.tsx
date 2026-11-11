// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type DocumentsState = {
  currentDocument: { id: string } | null;
  loadingDocumentId: string | null;
  documentLoadError: { id: string; status: number } | null;
};

const state = vi.hoisted(() => ({
  documents: { currentDocument: null, loadingDocumentId: null, documentLoadError: null } as DocumentsState,
  dispatch: vi.fn(),
}));
vi.mock("@/store/hooks", () => ({
  useAppDispatch: () => state.dispatch,
  useAppSelector: (select: (s: { documents: DocumentsState }) => unknown) => select({ documents: state.documents }),
}));
vi.mock("@/store/documents/documentSlice", () => ({
  fetchDocument: (id: string) => ({ type: "documents/fetchDocument", meta: { arg: id } }),
}));
vi.mock("@/lib/documents/kind", () => ({ isAssessmentDoc: () => false }));
vi.mock("next/dynamic", () => ({ default: () => () => createElement("div", null, "editor") }));
vi.mock("@/components/document-editor/DocumentEditorSkeleton", () => ({
  DocumentEditorSkeleton: () => createElement("div", null, "skeleton"),
}));
vi.mock("@/components/document-editor/DocumentNotFound", () => ({
  DocumentNotFound: () => createElement("div", null, "not-found"),
}));

import { EditorSwitch } from "./EditorSwitch";

let root: Root;
let container: HTMLDivElement;

function render(documentId: string) {
  act(() =>
    root.render(
      createElement(EditorSwitch, {
        documentId,
        defaultTitle: "",
        generateMessage: "",
        chatTitle: "",
        chatPlaceholder: "",
      }),
    ),
  );
  return container.textContent;
}

function fetchesFor(id: string) {
  return state.dispatch.mock.calls.filter(([action]) => action.meta?.arg === id).length;
}

beforeEach(() => {
  state.documents = { currentDocument: null, loadingDocumentId: null, documentLoadError: null };
  state.dispatch.mockReset();
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
});

describe("EditorSwitch loading state", () => {
  it("shows the skeleton, not 'not found', while another document is still in the store", () => {
    state.documents.currentDocument = { id: "previous" };
    expect(render("route")).toBe("skeleton");
    expect(fetchesFor("route")).toBe(1);
  });

  it("shows 'not found' only after the fetch for this document failed", () => {
    render("route");
    state.documents.documentLoadError = { id: "route", status: 404 };
    expect(render("route")).toBe("not-found");
    expect(fetchesFor("route")).toBe(1);
  });

  it("ignores a load error that belongs to another document", () => {
    render("route");
    state.documents.documentLoadError = { id: "other", status: 404 };
    expect(render("route")).toBe("skeleton");
  });

  it("fetches the document again when another document replaces it in the store", () => {
    state.documents.currentDocument = { id: "route" };
    expect(render("route")).toBe("editor");
    state.documents.currentDocument = { id: "other" };
    expect(render("route")).toBe("skeleton");
    expect(fetchesFor("route")).toBe(1);
  });
});
