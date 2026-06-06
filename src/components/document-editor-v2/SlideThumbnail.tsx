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

interface Props {
  slide: CanvasSlide;
  index: number;
  isActive?: boolean;
  onClick?: () => void;
}

export function SlideThumbnail({ slide, index, isActive, onClick }: Props) {
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
          ? "ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
          : "ring-1 ring-border hover:ring-primary/50"
      }`}
      style={{ width: THUMB_W, height: THUMB_H }}
    >
      <Stage width={THUMB_W} height={THUMB_H} listening={false}>
        <Layer listening={false}>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={THUMB_W}
            height={THUMB_H}
            fill={slide.background}
            listening={false}
          />

          {/* Elements */}
          {slide.elements.map((el) => {
            if (el.type === "text") {
              const t = el as CanvasTextElement;
              return (
                <Text
                  key={el.id}
                  x={el.x * THUMB_W + el.w * THUMB_W / 2}
                  y={el.y * THUMB_H + el.h * THUMB_H / 2}
                  offsetX={el.w * THUMB_W / 2}
                  offsetY={el.h * THUMB_H / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * THUMB_W}
                  height={el.h * THUMB_H}
                  text={t.text}
                  fontSize={Math.max(5, Math.round(t.fontSize * THUMB_W))}
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
                  x={el.x * THUMB_W + el.w * THUMB_W / 2}
                  y={el.y * THUMB_H + el.h * THUMB_H / 2}
                  offsetX={el.w * THUMB_W / 2}
                  offsetY={el.h * THUMB_H / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * THUMB_W}
                  height={el.h * THUMB_H}
                  text={text}
                  fontSize={Math.max(4, Math.round(el.fontSize * THUMB_W))}
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
                    x={el.x * THUMB_W + el.w * THUMB_W / 2}
                    y={el.y * THUMB_H + el.h * THUMB_H / 2}
                    offsetX={el.w * THUMB_W / 2}
                    offsetY={el.h * THUMB_H / 2}
                    rotation={el.rotation ?? 0}
                    width={el.w * THUMB_W}
                    height={el.h * THUMB_H}
                    cornerRadius={2}
                    listening={false}
                  />
                );
              }
              // Placeholder while loading or no URL
              return (
                <Rect
                  key={el.id}
                  x={el.x * THUMB_W + el.w * THUMB_W / 2}
                  y={el.y * THUMB_H + el.h * THUMB_H / 2}
                  offsetX={el.w * THUMB_W / 2}
                  offsetY={el.h * THUMB_H / 2}
                  rotation={el.rotation ?? 0}
                  width={el.w * THUMB_W}
                  height={el.h * THUMB_H}
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
              const strokeWidth = Math.max(1, (shape.strokeWidth ?? SHAPE_STROKE_WIDTH) * THUMB_W);
              const centerX = el.x * THUMB_W + (el.w * THUMB_W) / 2;
              const centerY = el.y * THUMB_H + (el.h * THUMB_H) / 2;

              if (shape.shape === "rect") {
                return (
                  <Rect
                    key={el.id}
                    x={centerX}
                    y={centerY}
                    offsetX={(el.w * THUMB_W) / 2}
                    offsetY={(el.h * THUMB_H) / 2}
                    rotation={el.rotation ?? 0}
                    width={el.w * THUMB_W}
                    height={el.h * THUMB_H}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    cornerRadius={4}
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
                    radiusX={(el.w * THUMB_W) / 2}
                    radiusY={(el.h * THUMB_H) / 2}
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
                  offsetX={(el.w * THUMB_W) / 2}
                  offsetY={(el.h * THUMB_H) / 2}
                  rotation={el.rotation ?? 0}
                  points={[0, (el.h * THUMB_H) / 2, el.w * THUMB_W, (el.h * THUMB_H) / 2]}
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
      <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[9px] leading-tight text-white/70">
        {index + 1}
      </span>

    </button>
  );
}
