import { describe, expect, it } from "vitest";
import { injectEquations, mathPictureName, mathRunToken, mathTextName } from "./pptx-math";

const rPr =
  '<a:rPr lang="en-US" sz="2600" b="1" dirty="0"><a:solidFill><a:srgbClr val="E5E7EB"/></a:solidFill>' +
  '<a:latin typeface="Calibri" pitchFamily="34" charset="0"/></a:rPr>';
const run = (text: string) => `<a:r>${rPr}<a:t>${text}</a:t></a:r>`;
const slide =
  `<p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="${mathTextName(0)}"></p:cNvPr></p:nvSpPr><p:txBody><a:p>` +
  `<a:pPr algn="l"><a:buNone/></a:pPr>${run("Metade é ")}<a:pPr algn="l"><a:buNone/></a:pPr>${run(mathRunToken(0, 0))}` +
  `${run(".")}</a:p></p:txBody></p:sp>` +
  `<p:pic><p:nvPicPr><p:cNvPr id="3" name="${mathPictureName(0)}" descr=""/></p:nvPicPr></p:pic>` +
  "<p:sp><p:nvSpPr><p:cNvPr id=\"4\" name=\"Text 1\"></p:cNvPr></p:nvSpPr></p:sp></p:spTree>";
const omml =
  '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:f><m:num><m:r><m:t>1</m:t></m:r>' +
  "</m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f></m:oMath>";

describe("injectEquations", () => {
  const out = injectEquations(slide, 0, [omml]);

  it("swaps the placeholder run for an equation in the text's style", () => {
    expect(out).not.toContain("[[imath:");
    expect(out).toContain("<a14:m><m:oMath");
    expect(out).toContain('<m:r><a:rPr lang="en-US" sz="2600" b="1" dirty="0">');
    expect(out).toContain('typeface="Cambria Math"');
    expect(out).toContain(`${run("Metade é ")}<a14:m>`);
  });

  it("wraps the box with its picture as the fallback, once", () => {
    expect(out).toMatch(/^<p:spTree><mc:AlternateContent [^>]*><mc:Choice [^>]*Requires="a14"><p:sp>/);
    expect(out).toContain("</p:sp></mc:Choice><mc:Fallback><p:pic>");
    expect(out.match(/<p:pic>/g)).toHaveLength(1);
    expect(out).toContain('</mc:AlternateContent><p:sp><p:nvSpPr><p:cNvPr id="4" name="Text 1">');
  });

  it("keeps one paragraph-properties element per paragraph, the first child", () => {
    expect(out.match(/<a:pPr /g)).toHaveLength(1);
    expect(out).toContain('<a:p><a:pPr algn="l"><a:buNone/></a:pPr><a:r>');
  });

  it("leaves the slide alone when the box is not on it", () => {
    expect(injectEquations(slide, 7, [omml])).toBe(slide);
  });
});
