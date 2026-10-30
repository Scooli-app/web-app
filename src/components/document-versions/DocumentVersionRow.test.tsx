import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DocumentVersionSummary } from "@/shared/types/document-versions";

vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const formatter = actual.createFormatter({ locale: "pt-PT", timeZone: "UTC" });
  return {
    useTranslations: () => (key: string) => key,
    useFormatter: () => formatter,
    useNow: () => new Date(),
  };
});

import { DocumentVersionRestoreButton, DocumentVersionRow } from "./DocumentVersionRow";

function version(overrides: Partial<DocumentVersionSummary> = {}): DocumentVersionSummary {
  return {
    id: "v-1",
    versionNumber: 1,
    kind: "teacher_edit",
    status: "superseded",
    title: "Plano",
    createdAt: "2026-10-20T09:00:00Z",
    createdBy: "teacher-1",
    reason: null,
    ...overrides,
  };
}

const noop = vi.fn();

describe("DocumentVersionRow", () => {
  it("shows the kind label of the version", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentVersionRow, { version: version({ kind: "teacher_edit" }), selected: false, onSelect: noop })
    );
    expect(html).toContain("kind.teacherEdit");
  });

  it("shows the 'Atual' badge only on the current version", () => {
    const current = renderToStaticMarkup(
      createElement(DocumentVersionRow, { version: version({ status: "current" }), selected: false, onSelect: noop })
    );
    const older = renderToStaticMarkup(
      createElement(DocumentVersionRow, { version: version({ status: "superseded" }), selected: false, onSelect: noop })
    );
    expect(current).toContain("currentBadge");
    expect(older).not.toContain("currentBadge");
  });
});

describe("DocumentVersionRestoreButton", () => {
  it("is hidden on the current version", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentVersionRestoreButton, { version: version({ status: "current" }), onRestore: noop })
    );
    expect(html).toBe("");
  });

  it("is offered on any other version", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentVersionRestoreButton, { version: version({ status: "superseded" }), onRestore: noop })
    );
    expect(html).toContain("restoreButton");
  });
});
