import { describe, expect, it } from "vitest";
import type { DocumentVersionSummary } from "@/shared/types/document-versions";
import {
  canRestoreVersion,
  isListedVersion,
  listedVersions,
  pendingSuggestionVersion,
  versionLabelKey,
} from "./document-versions";

function version(overrides: Partial<DocumentVersionSummary> = {}): DocumentVersionSummary {
  return {
    id: "v-1",
    versionNumber: 1,
    kind: "generated",
    status: "superseded",
    title: "Plano",
    createdAt: "2026-10-20T09:00:00Z",
    createdBy: "teacher-1",
    reason: null,
    ...overrides,
  };
}

describe("versionLabelKey", () => {
  it.each([
    ["generated", "generated"],
    ["ai_edit", "aiEdit"],
    ["teacher_edit", "teacherEdit"],
    ["ai_suggestion", "aiSuggestion"],
    ["suggestion_applied", "suggestionApplied"],
    ["restored", "restored"],
  ] as const)("maps kind %s to label %s", (kind, expected) => {
    expect(versionLabelKey(version({ kind }))).toBe(expected);
  });

  it("reads an applied suggestion as 'Sugestão aplicada' whatever its kind", () => {
    expect(versionLabelKey(version({ kind: "ai_suggestion", status: "applied" }))).toBe("suggestionApplied");
  });
});

describe("listedVersions", () => {
  it("hides every suggestion row, applied ones included, and keeps the applied result row", () => {
    const rows = listedVersions([
      version({ id: "a", versionNumber: 1, status: "superseded" }),
      version({ id: "b", versionNumber: 2, kind: "ai_suggestion", status: "suggested" }),
      version({ id: "c", versionNumber: 3, kind: "ai_suggestion", status: "rejected" }),
      version({ id: "d", versionNumber: 4, kind: "ai_suggestion", status: "applied" }),
      version({ id: "f", versionNumber: 5, kind: "suggestion_applied", status: "current" }),
      version({ id: "e", versionNumber: 6, status: "current" }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["e", "f", "a"]);
  });

  it("orders the list newest first", () => {
    const rows = listedVersions([
      version({ id: "old", versionNumber: 1 }),
      version({ id: "new", versionNumber: 3 }),
      version({ id: "mid", versionNumber: 2 }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input array", () => {
    const input = [version({ versionNumber: 1 }), version({ id: "v-2", versionNumber: 2 })];
    listedVersions(input);
    expect(input[0].versionNumber).toBe(1);
  });
});

describe("isListedVersion", () => {
  it("is false for every suggestion row, whatever its status", () => {
    expect(isListedVersion(version({ kind: "ai_suggestion", status: "suggested" }))).toBe(false);
    expect(isListedVersion(version({ kind: "ai_suggestion", status: "rejected" }))).toBe(false);
    expect(isListedVersion(version({ kind: "ai_suggestion", status: "applied" }))).toBe(false);
  });

  it("is true for the applied result row and ordinary versions", () => {
    expect(isListedVersion(version({ kind: "suggestion_applied", status: "current" }))).toBe(true);
    expect(isListedVersion(version({ kind: "generated", status: "current" }))).toBe(true);
  });
});

describe("canRestoreVersion", () => {
  it("never offers to restore the current version", () => {
    expect(canRestoreVersion(version({ status: "current" }))).toBe(false);
  });

  it("offers to restore any other version", () => {
    expect(canRestoreVersion(version({ status: "superseded" }))).toBe(true);
    expect(canRestoreVersion(version({ status: "applied" }))).toBe(true);
  });
});

// The banner can be hidden with ✕, so Versões is where a pending suggestion stays reachable.
describe("pendingSuggestionVersion", () => {
  it("finds the suggestion still waiting for review", () => {
    const pending = version({ id: "s", kind: "ai_suggestion", status: "suggested", versionNumber: 3 });
    expect(pendingSuggestionVersion([version(), pending])).toBe(pending);
  });

  it("ignores rejected and applied suggestions", () => {
    expect(pendingSuggestionVersion([
      version({ kind: "ai_suggestion", status: "rejected" }),
      version({ kind: "ai_suggestion", status: "applied" }),
    ])).toBeNull();
  });
});
