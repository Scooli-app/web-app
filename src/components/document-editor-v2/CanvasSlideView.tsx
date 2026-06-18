"use client";

/**
 * CanvasSlideView — read-only, full-resolution Konva stage for a single
 * CanvasSlide. Used by the presentation / fullscreen viewer so the slide
 * renders with the exact same background, colours, fonts and element
 * positions as the editor — just non-interactive.
 *
 * The stage fills its parent container and maintains a 16:9 aspect ratio
 * via a ResizeObserver.  Pass any container size you like; the math is the
 * same fractional-coordinate approach as SlideKonvaEditor (pixel = frac × W/H).
 */

import type {
  CanvasGradient,
  CanvasImageElement,
  CanvasListElement,
  CanvasMathElement,
  CanvasShapeElement,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { renderKatexToPngDataUrl } from "@/components/document-editor-v2/math-render";
import { useEffect, useRef, useState } from "react";
import { Ellipse, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";

interface Props {
  slide: CanvasSlide;
}

const SHAPE_FILL = "rgba(103, 83, 255, 0.22)";
const SHAPE_STROKE = "#6753FF";
const SHAPE_STROKE_WIDTH = 0.004;
const MATH_COLOR = "#ffffff";
const TEXT_LINE_HEIGHT = 1.3;

function gradientProps(g: CanvasGradient, W: number, H: number) {
  const rad = (g.angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const halfDiag = Math.sqrt(W * W + H * H) / 2;
  return {
    fillLinearGradientStartPoint: { x: W / 2 - dx * halfDiag, y: H / 2 - dy * halfDiag },
    fillLinearGradientEndPoint: { x: W / 2 + dx * halfDiag, y: H / 2 + dy * halfDiag },
    fillLinearGradientColorStops: g.stops.flatMap((s) => [s.offset, s.color]) as number[],
  };
}

export function CanvasSlideView({ slide }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 720 });

  /* Image cache: url → loaded HTMLImageElement | "loading" */
  const imgCacheRef = useRef<Record<string, HTMLImageElement | "loading">>({});
  const mathCacheRef = useRef<Record<string, HTMLImageElement | "loading">>({});
  const [, setImgRevision] = useState(0);

  /* Track container dimensions */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setSize({ w, h: Math.round(w * (9 / 16)) });
    });
    ro.observe(el);
    // Seed with current size immediately
    const w = Math.round(el.clientWidth);
    if (w > 0) setSize({ w, h: Math.round(w * (9 / 16)) });
    return () => ro.disconnect();
  }, []);

  /* Load images referenced by image_placeholder elements */
  useEffect(() => {
    for (const el of slide.elements) {
      if (el.type !== "image_placeholder") continue;
      const img = el as CanvasImageElement;
      const { url } = img;
      if (!url || url in imgCacheRef.current) continue;
      imgCacheRef.current[url] = "loading";
      const i = new window.Image();
      i.crossOrigin = "anonymous";
      i.onload = () => {
        imgCacheRef.current[url] = i;
        setImgRevision((r) => r + 1);
      };
      i.onerror = () => {
        delete imgCacheRef.current[url];
      };
      i.src = url;
    }
  }, [slide.elements]);

  const { w: W, h: H } = size;

  useEffect(() => {
    let cancelled = false;

    for (const el of slide.elements) {
      if (el.type !== "math") continue;
      const math = el as CanvasMathElement;
      const pixelHeight = Math.max(1, Math.round(el.h * H));
      const cacheKey = `${math.tex}__${MATH_COLOR}__${pixelHeight}`;
      if (cacheKey in mathCacheRef.current) continue;
      mathCacheRef.current[cacheKey] = "loading";

      void renderKatexToPngDataUrl(math.tex, { color: MATH_COLOR, pixelHeight })
        .then(({ dataUrl }) => {
          if (cancelled || !dataUrl) {
            if (!dataUrl) delete mathCacheRef.current[cacheKey];
            return;
          }
          const image = new window.Image();
          image.onload = () => {
            if (cancelled) return;
            mathCacheRef.current[cacheKey] = image;
            setImgRevision((r) => r + 1);
          };
          image.onerror = () => {
            delete mathCacheRef.current[cacheKey];
          };
          image.src = dataUrl;
        })
        .catch(() => {
          delete mathCacheRef.current[cacheKey];
        });
    }

    return () => {
      cancelled = true;
    };
  }, [H, slide.elements]);

  return (
    <div ref={containerRef} style={{ width: "100%", aspectRatio: "16/9" }}>
      <Stage width={W} height={H} listening={false}>
        <Layer listening={false}>
          {/* Background */}
          <Rect
            x={0} y={0}
            width={W} height={H}
            fill={slide.backgroundGradient ? undefined : slide.background}
            {...(slide.backgroundGradient ? gradientProps(slide.backgroundGradient, W, H) : {})}
            listening={false}
          />

          {/* Elements */}
          {slide.elements.map((el) => {
            /* ---- text ---- */
            if (el.type === "text") {
              const t = el as CanvasTextElement;
              return (
                <Text
                  key={el.id}
                  x={el.x * W + el.w * W / 2}
                  y={el.y * H + el.h * H / 2}
                  offsetX={el.w * W / 2}
                  offsetY={el.h * H / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * W}
                  height={el.h * H}
                  text={t.text}
                  fontSize={Math.round(t.fontSize * W)}
                  fontFamily={
                    t.fontFamily
                      ? t.fontFamily
                      : "Lexend, Inter, system-ui, sans-serif"
                  }
                  fontStyle={t.fontStyle}
                  textDecoration={t.underline ? "underline" : ""}
                  fill={t.color}
                  align={t.align}
                  lineHeight={TEXT_LINE_HEIGHT}
                  wrap="word"
                  ellipsis={false}
                  listening={false}
                />
              );
            }

            /* ---- bullet / ordered list ---- */
            if (el.type === "bullet_list" || el.type === "ordered_list") {
              const l = el as CanvasListElement;
              const text = l.items
                .map((item, i) =>
                  el.type === "ordered_list" ? `${i + 1}. ${item}` : `• ${item}`,
                )
                .join("\n");
              return (
                <Text
                  key={el.id}
                  x={el.x * W + el.w * W / 2}
                  y={el.y * H + el.h * H / 2}
                  offsetX={el.w * W / 2}
                  offsetY={el.h * H / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * W}
                  height={el.h * H}
                  text={text}
                  fontSize={Math.round(el.fontSize * W)}
                  fontFamily="Lato, Inter, system-ui, sans-serif"
                  fill={l.color}
                  lineHeight={TEXT_LINE_HEIGHT}
                  wrap="word"
                  ellipsis={false}
                  listening={false}
                />
              );
            }

            /* ---- math placeholder ---- */
            if (el.type === "math") {
              const m = el as CanvasMathElement;
              const pixelHeight = Math.max(1, Math.round(el.h * H));
              const cacheKey = `${m.tex}__${MATH_COLOR}__${pixelHeight}`;
              const cached = mathCacheRef.current[cacheKey];
              if (cached && cached !== "loading") {
                // Aspect-fit the formula inside its box (no stretching), centred.
                const boxW = el.w * W;
                const boxH = el.h * H;
                const natW = cached.naturalWidth || cached.width || boxW;
                const natH = cached.naturalHeight || cached.height || boxH;
                const fit = Math.min(boxW / natW, boxH / natH);
                const drawW = natW * fit;
                const drawH = natH * fit;
                return (
                  <KonvaImage
                    key={el.id}
                    image={cached}
                    x={el.x * W + el.w * W / 2}
                    y={el.y * H + el.h * H / 2}
                    offsetX={drawW / 2}
                    offsetY={drawH / 2}
                    rotation={el.rotation ?? 0}
                    width={drawW}
                    height={drawH}
                    listening={false}
                  />
                );
              }
              return (
                <Text
                  key={el.id}
                  x={el.x * W + el.w * W / 2}
                  y={el.y * H + el.h * H / 2}
                  offsetX={el.w * W / 2}
                  offsetY={el.h * H / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * W}
                  height={el.h * H}
                  text={m.tex}
                  fontSize={Math.round(el.fontSize * W)}
                  fontFamily="monospace"
                  fill={MATH_COLOR}
                  listening={false}
                />
              );
            }

            /* ---- image ---- */
            if (el.type === "image_placeholder") {
              const img = el as CanvasImageElement;
              const cached = img.url ? imgCacheRef.current[img.url] : undefined;
              if (cached && cached !== "loading") {
                return (
                  <KonvaImage
                    key={el.id}
                    image={cached}
                    x={el.x * W + el.w * W / 2}
                    y={el.y * H + el.h * H / 2}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    rotation={el.rotation ?? 0}
                    width={el.w * W}
                    height={el.h * H}
                    cornerRadius={4}
                    listening={false}
                  />
                );
              }
              /* Placeholder while loading or no URL */
              return (
                <Rect
                  key={el.id}
                  x={el.x * W + el.w * W / 2}
                  y={el.y * H + el.h * H / 2}
                  offsetX={el.w * W / 2}
                  offsetY={el.h * H / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * W}
                  height={el.h * H}
                  fill="#2a2a3a"
                  cornerRadius={4}
                  listening={false}
                />
              );
            }

            if (el.type === "shape") {
              const shape = el as CanvasShapeElement;
              const fill = shape.fill ?? SHAPE_FILL;
              const stroke = shape.stroke ?? SHAPE_STROKE;
              const rawSW = shape.strokeWidth ?? SHAPE_STROKE_WIDTH;
              const strokeWidth = rawSW === 0 ? 0 : Math.max(1, rawSW * W);
              const centerX = el.x * W + (el.w * W) / 2;
              const centerY = el.y * H + (el.h * H) / 2;

              if (shape.shape === "rect") {
                return (
                  <Rect
                    key={el.id}
                    x={centerX}
                    y={centerY}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    rotation={el.rotation ?? 0}
                    width={el.w * W}
                    height={el.h * H}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    cornerRadius={shape.cornerRadius ?? 8}
                    listening={false}
                  />
                );
              }

              if (shape.shape === "ellipse") {
                return (
                  <Ellipse
                    key={el.id}
                    x={centerX}
                    y={centerY}
                    rotation={el.rotation ?? 0}
                    radiusX={el.w * W / 2}
                    radiusY={el.h * H / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    listening={false}
                  />
                );
              }

              return (
                <Line
                  key={el.id}
                  x={centerX}
                  y={centerY}
                  offsetX={el.w * W / 2}
                  offsetY={el.h * H / 2}
                  rotation={el.rotation ?? 0}
                  points={[0, el.h * H / 2, el.w * W, el.h * H / 2]}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  lineCap="round"
                  listening={false}
                />
              );
            }

            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
