import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("./client", () => ({ default: http, ApiRequestError: class extends Error {} }));

import { deleteSchoolSource, updateSchoolSource, uploadSchoolSource } from "./school-sources.service";

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset().mockResolvedValue({ data: {} }));
});

describe("school-sources.service", () => {
  it("uploads tags as repeated multipart fields, as the backend's @RestForm lists read them", async () => {
    const file = new File(["x"], "Regulamento.pdf");
    await uploadSchoolSource({
      file, name: "Regulamento", type: "regra", subjects: ["Mathematics", "Portuguese"], schoolYears: [7, 8], defaultEnabled: false,
    });
    const [url, form] = http.post.mock.calls[0] as [string, FormData];
    expect(url).toBe("/organizations/current/sources");
    expect(form.getAll("subjects")).toEqual(["Mathematics", "Portuguese"]);
    expect(form.getAll("schoolYears")).toEqual(["7", "8"]);
    expect(form.get("defaultEnabled")).toBe("false");
    expect(form.get("type")).toBe("regra");
    expect((form.get("file") as File).name).toBe("Regulamento.pdf");
  });

  it("sends no tag fields when none are ticked (untagged = all)", async () => {
    await uploadSchoolSource({ file: new File(["x"], "a.pdf"), name: "a", type: "apoio", subjects: [], schoolYears: [], defaultEnabled: true });
    const form = http.post.mock.calls[0][1] as FormData;
    expect(form.has("subjects")).toBe(false);
    expect(form.has("schoolYears")).toBe(false);
  });

  it("patches only the fields it is given, as JSON", async () => {
    await updateSchoolSource("s1", { defaultEnabled: false });
    expect(http.patch).toHaveBeenCalledWith("/organizations/current/sources/s1", { defaultEnabled: false });
  });

  it("deletes by id", async () => {
    await deleteSchoolSource("s1");
    expect(http.delete).toHaveBeenCalledWith("/organizations/current/sources/s1");
  });
});
