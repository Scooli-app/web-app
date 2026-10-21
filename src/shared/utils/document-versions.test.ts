import { describe, expect, it } from "vitest";
import type { DocumentVersionSummary } from "@/shared/types/document-versions";
import {
  canRestoreVersion,
  isListedVersion,
  listedVersions,
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
  it("hides suggested and rejected rows and keeps applied suggestions", () => {
    const rows = listedVersions([
      version({ id: "a", versionNumber: 1, status: "superseded" }),
      version({ id: "b", versionNumber: 2, kind: "ai_suggestion", status: "suggested" }),
      version({ id: "c", versionNumber: 3, kind: "ai_suggestion", status: "rejected" }),
      version({ id: "d", versionNumber: 4, kind: "ai_suggestion", status: "applied" }),
      version({ id: "e", versionNumber: 5, status: "current" }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["e", "d", "a"]);
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
  it("is false for open and dismissed suggestions only", () => {
    expect(isListedVersion(version({ status: "suggested" }))).toBe(false);
    expect(isListedVersion(version({ status: "rejected" }))).toBe(false);
    expect(isListedVersion(version({ status: "current" }))).toBe(true);
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
