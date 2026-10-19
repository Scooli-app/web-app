/**
 * Konva text measurement shared by the slide editor and the read-only slide
 * view (ENG-231). Browser-only: callers run it from client components.
 */
import Konva from "konva";

export const TEXT_LINE_HEIGHT = 1.3;

export function measureWrappedTextHeightPx({
  text,
  widthPx,
  fontSizePx,
  fontFamily,
  fontStyle,
  lineHeight = TEXT_LINE_HEIGHT,
}: {
  text: string;
  widthPx: number;
  fontSizePx: number;
  fontFamily: string;
  fontStyle?: string;
  lineHeight?: number;
}) {
  const probe = new Konva.Text({
    text,
    fontSize: fontSizePx,
    fontFamily,
    fontStyle,
    lineHeight,
    width: Math.max(1, widthPx),
    padding: 0,
    wrap: "word",
  });
  return Math.max(fontSizePx * lineHeight, probe.height());
}
