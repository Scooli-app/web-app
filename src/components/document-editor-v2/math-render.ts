"use client";

import katex from "katex";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar imagem SVG de matemática."));
    image.src = src;
  });
}

/**
 * Extract a bare, self-contained <math> element from KaTeX's MathML output.
 *
 * We deliberately render with output:"mathml" and strip the surrounding
 * `katex`/`katex-mathml` wrappers: those carry CSS (loaded globally via
 * katex.css) that visually *hides* the MathML for screen-reader use
 * (position:absolute; clip; width:1px). Inside the isolated SVG <foreignObject>
 * the page stylesheet does not apply, but a bare <math> node renders natively
 * in Chromium's MathML engine — giving a visible, self-contained formula.
 */
function extractMathMarkup(html: string) {
  const doc = new window.DOMParser().parseFromString(html, "text/html");
  const mathNode = doc.querySelector("math");
  if (!mathNode) return html;
  mathNode.removeAttribute("class");
  mathNode.setAttribute("display", "block");
  return mathNode.outerHTML;
}

async function renderSvgMarkupToPngDataUrl(markup: string, color: string, pixelHeight: number) {
  // 1) Measure the formula's natural aspect ratio at a reference font size.
  const REF_FONT = 64;
  const measure = document.createElement("div");
  measure.style.cssText =
    `position:fixed;left:-99999px;top:0;display:inline-block;padding:0;margin:0;` +
    `background:transparent;color:${color};font-size:${REF_FONT}px;line-height:1.2;width:max-content;`;
  measure.innerHTML = markup;
  document.body.appendChild(measure);

  let refWidth: number;
  let refHeight: number;
  try {
    const rect = measure.getBoundingClientRect();
    refWidth = Math.max(1, rect.width);
    refHeight = Math.max(1, rect.height);
  } finally {
    measure.remove();
  }

  // 2) Render the SVG at the FINAL target size (no raster upscaling), with a
  //    2x device-pixel supersample for crisp edges.
  const SS = 2;
  const fontSize = (REF_FONT * pixelHeight) / refHeight;
  const width = Math.max(1, Math.ceil((refWidth * pixelHeight) / refHeight));
  const height = Math.max(1, Math.ceil(pixelHeight));
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<foreignObject width="100%" height="100%">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="display:inline-block;padding:0;margin:0;background:transparent;color:${escapeHtml(color)};font-size:${fontSize}px;line-height:1.2;width:max-content;">`,
    markup,
    "</div>",
    "</foreignObject>",
    "</svg>",
  ].join("");
  const svgImage = await loadImage(buildSvgDataUrl(svg));
  const canvas = document.createElement("canvas");
  canvas.width = width * SS;
  canvas.height = height * SS;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Contexto 2D indisponível para renderização de matemática.");
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(svgImage, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
  };
}

async function renderPlainTextToPngDataUrl(tex: string, color: string, pixelHeight: number) {
  const fontSize = Math.max(12, Math.round(pixelHeight * 0.72));
  const lines = tex.split("\n");
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  if (!measure) {
    return {
      dataUrl: "",
      width: Math.max(1, Math.round(pixelHeight)),
      height: pixelHeight,
    };
  }
  measure.font = `${fontSize}px serif`;
  const lineHeight = Math.max(fontSize * 1.25, 1);
  const width = Math.max(
    1,
    Math.ceil(Math.max(...lines.map((line) => measure.measureText(line || " ").width))),
  );
  const height = Math.max(1, Math.ceil(lineHeight * Math.max(lines.length, 1)));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: "", width, height };
  }
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${fontSize}px serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    ctx.fillText(line || " ", 0, index * lineHeight);
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
  };
}

export async function renderKatexToPngDataUrl(
  tex: string,
  opts: { color: string; pixelHeight: number },
): Promise<{ dataUrl: string; width: number; height: number }> {
  const color = opts.color;
  const pixelHeight = Math.max(1, Math.round(opts.pixelHeight));

  if (typeof window === "undefined" || typeof document === "undefined") {
    return { dataUrl: "", width: pixelHeight, height: pixelHeight };
  }

  try {
    const html = katex.renderToString(tex, { throwOnError: false, displayMode: true, output: "mathml" });
    const markup = extractMathMarkup(html);
    return await renderSvgMarkupToPngDataUrl(markup, color, pixelHeight);
  } catch {
    return renderPlainTextToPngDataUrl(tex, color, pixelHeight);
  }
}
