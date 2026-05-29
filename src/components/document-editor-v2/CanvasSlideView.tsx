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
  CanvasImageElement,
  CanvasListElement,
  CanvasMathElement,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Text } from "react-konva";

interface Props {
  slide: CanvasSlide;
}

export function CanvasSlideView({ slide }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 720 });

  /* Image cache: url → loaded HTMLImageElement | "loading" */
  const imgCacheRef = useRef<Record<string, HTMLImageElement | "loading">>({});
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
      if (!img.url || img.url in imgCacheRef.current) continue;
      imgCacheRef.current[img.url] = "loading";
      const i = new window.Image();
      i.crossOrigin = "anonymous";
      i.onload = () => {
        imgCacheRef.current[img.url!] = i;
        setImgRevision((r) => r + 1);
      };
      i.onerror = () => {
        delete imgCacheRef.current[img.url!];
      };
      i.src = img.url;
    }
  }, [slide.elements]);

  const { w: W, h: H } = size;

  return (
    <div ref={containerRef} style={{ width: "100%", aspectRatio: "16/9" }}>
      <Stage width={W} height={H} listening={false}>
        <Layer listening={false}>
          {/* Background */}
          <Rect
            x={0} y={0}
            width={W} height={H}
            fill={slide.background}
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
                  x={el.x * W}
                  y={el.y * H}
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
                  fill={t.color}
                  align={t.align}
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
                  x={el.x * W}
                  y={el.y * H}
                  width={el.w * W}
                  height={el.h * H}
                  text={text}
                  fontSize={Math.round(el.fontSize * W)}
                  fontFamily="Lexend, Inter, system-ui, sans-serif"
                  fill={l.color}
                  lineHeight={1.4}
                  wrap="word"
                  ellipsis={false}
                  listening={false}
                />
              );
            }

            /* ---- math placeholder ---- */
            if (el.type === "math") {
              const m = el as CanvasMathElement;
              return (
                <Text
                  key={el.id}
                  x={el.x * W}
                  y={el.y * H}
                  width={el.w * W}
                  height={el.h * H}
                  text={m.tex}
                  fontSize={Math.round(el.fontSize * W)}
                  fontFamily="monospace"
                  fill="#ffffff"
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
                    x={el.x * W}
                    y={el.y * H}
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
                  x={el.x * W}
                  y={el.y * H}
                  width={el.w * W}
                  height={el.h * H}
                  fill="#2a2a3a"
                  cornerRadius={4}
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
