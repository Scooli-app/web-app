import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./client", () => ({ default: http }));

import { getDocumentVersion, getDocumentVersions, restoreDocumentVersion } from "./document.service";

const summary = {
  id: "v-2",
  versionNumber: 2,
  kind: "ai_edit",
  status: "superseded",
  title: "Plano",
  createdAt: "2026-10-20T09:00:00Z",
  createdBy: "teacher-1",
  reason: null,
};

beforeEach(() => {
  http.get.mockReset();
  http.post.mockReset();
});

describe("getDocumentVersions", () => {
  it("loads the version list of a document", async () => {
    http.get.mockResolvedValue({ data: [summary] });
    await expect(getDocumentVersions("doc-1")).resolves.toEqual([summary]);
    expect(http.get).toHaveBeenCalledWith("/documents/doc-1/versions");
  });
});

describe("getDocumentVersion", () => {
  it("loads one version with its content", async () => {
    const detail = { ...summary, content: "# Plano", contentFormat: "markdown" };
    http.get.mockResolvedValue({ data: detail });
    await expect(getDocumentVersion("doc-1", "v-2")).resolves.toEqual(detail);
    expect(http.get).toHaveBeenCalledWith("/documents/doc-1/versions/v-2");
  });

  it("encodes both ids in the path", async () => {
    http.get.mockResolvedValue({ data: {} });
    await getDocumentVersion("doc 1/x", "v?2");
    expect(http.get).toHaveBeenCalledWith("/documents/doc%201%2Fx/versions/v%3F2");
  });
});

describe("restoreDocumentVersion", () => {
  it("posts the restore and returns the updated document", async () => {
    const document = { id: "doc-1", title: "Plano", content: "# Plano", contentFormat: "markdown" };
    http.post.mockResolvedValue({ data: document });
    await expect(restoreDocumentVersion("doc-1", "v-2")).resolves.toMatchObject({ id: "doc-1", content: "# Plano" });
    expect(http.post).toHaveBeenCalledWith("/documents/doc-1/versions/v-2/restore");
  });
});
