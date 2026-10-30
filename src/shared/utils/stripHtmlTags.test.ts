import { describe, expect, it } from "vitest";

import { stripHtmlTags } from "./stripHtmlTags";

describe("stripHtmlTags", () => {
  it("removes tags and keeps the text", () => {
    expect(stripHtmlTags("<p>Olá <strong>turma</strong></p>")).toBe("Olá turma");
  });

  it("leaves no tag behind when tags are nested inside each other", () => {
    expect(stripHtmlTags("<scr<b>ipt>alert(1)</scr</b>ipt>")).not.toContain("<");
  });

  it("leaves text without tags unchanged", () => {
    expect(stripHtmlTags("3 > 2 e 1 < 2")).toBe("3 > 2 e 1 < 2");
  });
});
