import { describe, expect, it } from "vitest";
import reducer, { setPendingAiEdit } from "./documentSlice";

function stateWith(doc: unknown) {
  const base = reducer(undefined, { type: "init" });
  return { ...base, currentDocument: doc as never };
}

const doc = { id: "doc-1", content: "# Frações", metadata: { prompt: "frações" } };

describe("setPendingAiEdit (ENG-408)", () => {
  it("records a proposal on the open document, keeping the other metadata", () => {
    const next = reducer(stateWith(doc), setPendingAiEdit({ id: "doc-1", content: "# Proposta" }));
    expect(next.currentDocument?.metadata).toEqual({ prompt: "frações", pendingAiEdit: { content: "# Proposta" } });
  });

  it("drops a resolved proposal, so it is not offered again on return", () => {
    const withProposal = { ...doc, metadata: { prompt: "frações", pendingAiEdit: { content: "# Proposta" } } };
    const next = reducer(stateWith(withProposal), setPendingAiEdit({ id: "doc-1", content: null }));
    expect(next.currentDocument?.metadata).toEqual({ prompt: "frações" });
  });

  it("works when the document has no metadata yet", () => {
    const next = reducer(stateWith({ ...doc, metadata: null }), setPendingAiEdit({ id: "doc-1", content: "# P" }));
    expect(next.currentDocument?.metadata).toEqual({ pendingAiEdit: { content: "# P" } });
  });

  it("ignores another document", () => {
    const next = reducer(stateWith(doc), setPendingAiEdit({ id: "doc-2", content: "# Proposta" }));
    expect(next.currentDocument?.metadata).toEqual({ prompt: "frações" });
  });
});
