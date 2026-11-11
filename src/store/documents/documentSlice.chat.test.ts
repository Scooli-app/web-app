import { describe, expect, it } from "vitest";
import type { ChatResponse } from "@/shared/types";
import reducer, { chatWithDocument } from "./documentSlice";

const stored = {
  id: "doc-1",
  title: "Frações",
  content: "# Frações\n\nTexto guardado",
  contentVersion: "v1",
} as never;

function stateWith(doc: unknown) {
  const base = reducer(undefined, { type: "init" });
  return { ...base, currentDocument: doc as never, documents: [doc as never] };
}

function fulfilled(payload: Partial<ChatResponse>) {
  return chatWithDocument.fulfilled(
    { id: "doc-1", title: "Frações", chatAnswer: "ok", updatedAt: "now", content: "", ...payload } as ChatResponse,
    "req",
    { id: "doc-1", message: "x" },
  );
}

describe("chatWithDocument reducer", () => {
  it("a proposal awaiting review does not replace the stored content or version (ENG-408)", () => {
    const next = reducer(
      stateWith(stored),
      fulfilled({ content: "# Frações\n\nProposta da IA", contentVersion: "v1", pendingReview: true }),
    );
    expect(next.currentDocument?.content).toBe("# Frações\n\nTexto guardado");
    expect(next.currentDocument?.contentVersion).toBe("v1");
  });

  it("an edit saved by the server still updates the store (older behaviour)", () => {
    const next = reducer(
      stateWith(stored),
      fulfilled({ content: "# Frações\n\nNovo texto", contentVersion: "v2" }),
    );
    expect(next.currentDocument?.content).toBe("# Frações\n\nNovo texto");
    expect(next.currentDocument?.contentVersion).toBe("v2");
  });

  it("a failed request stores a readable error, not an object", () => {
    const action = chatWithDocument.rejected(null, "req", { id: "doc-1", message: "x" }, {
      kind: "timeout",
      message: null,
      status: null,
      errorCode: "timeout",
    });
    const next = reducer(stateWith(stored), action);
    expect(typeof next.error).toBe("string");
    expect(next.isChatting).toBe(false);
  });
});
