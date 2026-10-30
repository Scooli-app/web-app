/**
 * Native PowerPoint equations for inline `$…$` maths. pptxgenjs cannot write equations, so the export
 * writes each formula as a placeholder run in a named text box, plus a picture of the rendered box,
 * and this swaps the placeholders for OMML (`a14:m`) after the deck is built. The text box goes in
 * `mc:Choice` (PowerPoint 2010+, editable equations) and the picture in `mc:Fallback` (Google Slides,
 * Keynote and other apps that don't read a14).
 */

const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const A14_NS = "http://schemas.microsoft.com/office/drawing/2010/main";

export const mathRunToken = (box: number, formula: number) => `[[imath:${box}:${formula}]]`;
export const mathTextName = (box: number) => `imath-txt-${box}`;
export const mathPictureName = (box: number) => `imath-pic-${box}`;

/** The element spanning `<tag>…</tag>` around the object named `name`, or null. */
function findNamed(xml: string, tag: "p:sp" | "p:pic", name: string) {
  const at = xml.indexOf(`name="${name}"`);
  if (at < 0) return null;
  const start = xml.lastIndexOf(`<${tag}>`, at);
  const end = xml.indexOf(`</${tag}>`, at);
  if (start < 0 || end < 0) return null;
  return { start, end: end + tag.length + 3 };
}

/** Each OMML run gets the text run's formatting (size, colour, bold) in Cambria Math. */
function styleOmml(omml: string, runProps: string) {
  const mathProps = runProps.replace(/typeface="[^"]*"/g, 'typeface="Cambria Math"');
  return omml.replace(/<m:r>(<m:rPr>[\s\S]*?<\/m:rPr>)?/g, (_, rPr = "") => `<m:r>${rPr}${mathProps}`);
}

/**
 * Replaces box `box`'s placeholder runs with `omml[i]` and wraps the box with its fallback picture.
 * Returns the slide unchanged when the box or picture is not found.
 */
export function injectEquations(slideXml: string, box: number, omml: string[]): string {
  const pic = findNamed(slideXml, "p:pic", mathPictureName(box));
  if (!pic) return slideXml;
  const picture = slideXml.slice(pic.start, pic.end);
  const xml = slideXml.slice(0, pic.start) + slideXml.slice(pic.end);
  const sp = findNamed(xml, "p:sp", mathTextName(box));
  if (!sp) return slideXml;
  const run = new RegExp(
    // the run's properties may not reach past their own </a:rPr>, so a match never spans earlier runs
    `<a:r>(<a:rPr[^>]*/>|<a:rPr[^>]*>(?:(?!</a:rPr>)[\\s\\S])*</a:rPr>)?<a:t>\\[\\[imath:${box}:(\\d+)\\]\\]</a:t></a:r>`,
    "g",
  );
  const shape = xml
    .slice(sp.start, sp.end)
    .replace(run, (_, rPr: string | undefined, i: string) => `<a14:m>${styleOmml(omml[Number(i)] ?? "", rPr ?? "")}</a14:m>`)
    // pptxgenjs repeats <a:pPr> before every run of a paragraph; the schema allows it only first
    .replace(/(?<!<a:p>)<a:pPr[^>]*\/>|(?<!<a:p>)<a:pPr[^>]*>(?:(?!<\/a:pPr>)[\s\S])*<\/a:pPr>/g, "");
  const wrapped =
    `<mc:AlternateContent xmlns:mc="${MC_NS}"><mc:Choice xmlns:a14="${A14_NS}" Requires="a14">${shape}</mc:Choice>` +
    `<mc:Fallback>${picture}</mc:Fallback></mc:AlternateContent>`;
  return xml.slice(0, sp.start) + wrapped + xml.slice(sp.end);
}
