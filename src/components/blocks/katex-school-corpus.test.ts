import { readFileSync } from "node:fs";
import { join } from "node:path";
import katex from "katex";
import { describe, expect, it } from "vitest";

// Same list as chalkboard services/src/test/resources/export/school-latex-corpus.txt (PDF and Word check it there).
const corpus = readFileSync(join(__dirname, "__fixtures__", "school-latex-corpus.txt"), "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim());

describe("school LaTeX in the editor (KaTeX, as InlineText renders $...$)", () => {
  it("schoolLatexCorpusRendersInAllThree: every formula renders without an error", () => {
    expect(corpus.length).toBeGreaterThan(80);
    const failed = corpus.filter((tex) => {
      try {
        katex.renderToString(tex, { throwOnError: true, displayMode: false, strict: "ignore" });
        return false;
      } catch {
        return true;
      }
    });
    expect(failed).toEqual([]);
  });
});
