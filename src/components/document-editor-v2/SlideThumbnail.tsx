"use client";

/**
 * SlideThumbnail — mini 160×90 (16:9) Konva stage used in the slide sidebar.
 *
 * Renders all elements at scaled-down fractional coordinates; the same
 * proportion math applies (pixel = fraction × W/H) so no extra mapping
 * is needed — just use THUMB_W and THUMB_H as the reference dimensions.
 *
 * The stage is fully non-interactive (listening={false}).
 */

import type {
  CanvasGradient,
  CanvasImageElement,
  CanvasListElement,
  CanvasShapeElement,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { useEffect, useRef, useState } from "react";
import { Ellipse, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";

const THUMB_W = 160;
const THUMB_H = 90; // 16:9
const SHAPE_FILL = "rgba(103, 83, 255, 0.22)";
const SHAPE_STROKE = "#6753FF";
const SHAPE_STROKE_WIDTH = 0.004;

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

interface Props {
  slide: CanvasSlide;
  index: number;
  isActive?: boolean;
  onClick?: () => void;
  /** Thumbnail width in px. Defaults to 160. */
  w?: number;
  /** Thumbnail height in px. Defaults to 90. */
  h?: number;
  /** Show slide number badge. Defaults to true. */
  showIndex?: boolean;
  /** Tailwind class for the ring-offset color. Defaults to "ring-offset-sidebar". */
  ringOffset?: string;
}

export function SlideThumbnail({ slide, index, isActive, onClick, w = THUMB_W, h = THUMB_H, showIndex = true, ringOffset = "ring-offset-sidebar" }: Props) {
  /* Image cache: url → loaded HTMLImageElement | "loading" */
  const imgCacheRef = useRef<Record<string, HTMLImageElement | "loading">>({});
  const [, setImgRevision] = useState(0);

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
      i.onerror = () => { delete imgCacheRef.current[url]; };
      i.src = url;
    }
  }, [slide.elements]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Slide ${index + 1}`}
      className={`group relative overflow-hidden rounded transition-all outline-none ${
        isActive
          ? `ring-2 ring-primary ring-offset-2 ${ringOffset}`
          : "ring-1 ring-border hover:ring-primary/50"
      }`}
      style={{ width: w, height: h }}
    >
      <Stage width={w} height={h} listening={false}>
        <Layer listening={false}>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={slide.backgroundGradient ? undefined : slide.background}
            {...(slide.backgroundGradient ? gradientProps(slide.backgroundGradient, w, h) : {})}
            listening={false}
          />

          {/* Elements */}
          {slide.elements.map((el) => {
            if (el.type === "text") {
              const t = el as CanvasTextElement;
              return (
                <Text
                  key={el.id}
                  x={el.x * w + el.w * w / 2}
                  y={el.y * h + el.h * h / 2}
                  offsetX={el.w * w / 2}
                  offsetY={el.h * h / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * w}
                  height={el.h * h}
                  text={t.text}
                  fontSize={Math.max(5, Math.round(t.fontSize * w))}
                  fontFamily={t.fontFamily || "Inter, system-ui, sans-serif"}
                  fontStyle={t.fontStyle}
                  textDecoration={t.underline ? "underline" : ""}
                  fill={t.color}
                  align={t.align}
                  wrap="word"
                  ellipsis
                  listening={false}
                />
              );
            }

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
                  x={el.x * w + el.w * w / 2}
                  y={el.y * h + el.h * h / 2}
                  offsetX={el.w * w / 2}
                  offsetY={el.h * h / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * w}
                  height={el.h * h}
                  text={text}
                  fontSize={Math.max(4, Math.round(el.fontSize * w))}
                  fill={l.color}
                  wrap="word"
                  ellipsis
                  listening={false}
                />
              );
            }

            if (el.type === "image_placeholder") {
              const img = el as CanvasImageElement;
              const cached = img.url ? imgCacheRef.current[img.url] : undefined;
              if (cached && cached !== "loading") {
                return (
                  <KonvaImage
                    key={el.id}
                    image={cached}
                    x={el.x * w + el.w * w / 2}
                    y={el.y * h + el.h * h / 2}
                    offsetX={el.w * w / 2}
                    offsetY={el.h * h / 2}
                    rotation={el.rotation ?? 0}
                    width={el.w * w}
                    height={el.h * h}
                    cornerRadius={2}
                    listening={false}
                  />
                );
              }
              // Placeholder while loading or no URL
              return (
                <Rect
                  key={el.id}
                  x={el.x * w + el.w * w / 2}
                  y={el.y * h + el.h * h / 2}
                  offsetX={el.w * w / 2}
                  offsetY={el.h * h / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * w}
                  height={el.h * h}
                  fill="#2a2a3a"
                  cornerRadius={2}
                  listening={false}
                />
              );
            }

            if (el.type === "shape") {
              const shape = el as CanvasShapeElement;
              const fill = shape.fill ?? SHAPE_FILL;
              const stroke = shape.stroke ?? SHAPE_STROKE;
              const rawSW = shape.strokeWidth ?? SHAPE_STROKE_WIDTH;
              const strokeWidth = rawSW === 0 ? 0 : Math.max(1, rawSW * w);
              const centerX = el.x * w + (el.w * w) / 2;
              const centerY = el.y * h + (el.h * h) / 2;

              if (shape.shape === "rect") {
                return (
                  <Rect
                    key={el.id}
                    x={centerX}
                    y={centerY}
                    offsetX={(el.w * w) / 2}
                    offsetY={(el.h * h) / 2}
                    rotation={el.rotation ?? 0}
                    width={el.w * w}
                    height={el.h * h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    cornerRadius={shape.cornerRadius ?? 4}
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
                    radiusX={(el.w * w) / 2}
                    radiusY={(el.h * h) / 2}
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
                  offsetX={(el.w * w) / 2}
                  offsetY={(el.h * h) / 2}
                  rotation={el.rotation ?? 0}
                  points={[0, (el.h * h) / 2, el.w * w, (el.h * h) / 2]}
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

      {/* Slide number badge */}
      {showIndex && (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[9px] leading-tight text-white/70">
          {index + 1}
        </span>
      )}

    </button>
  );
}
