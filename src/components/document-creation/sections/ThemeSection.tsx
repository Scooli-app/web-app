/**
 * Visual-theme picker for the Presentations creation form.
 *
 * Styled to match the other standalone sections (e.g. {@link TeachingMethodSection}):
 * icon-badge + heading row inside a `Card`, rather than the ad-hoc `<div>` this
 * used to be inline in `DocumentCreationPage` — that div skipped the shared
 * padding scale, the hover elevation, and the icon/title header every other
 * section has, so it read as a leftover fragment rather than a real section.
 *
 * Only rendered when {@code documentType.id === "presentation"} (the caller
 * guards rendering; this component does not check the type itself).
 */
"use client";

import { Card } from "@/components/ui/card";
import { applyTheme } from "@/components/document-editor-v2/canvas-layout";
import { SlideThumbnail } from "@/components/document-editor-v2/SlideThumbnail";
import type { CanvasPresentation, CanvasSlide } from "@/shared/types/canvas-presentation";
import { THEMES } from "@/shared/types/presentation-theme";
import { cn } from "@/shared/utils/utils";
import { Palette } from "lucide-react";
import { useMemo } from "react";
import type { FormUpdateFn } from "../types";

/** Applied when the user hasn't picked a theme yet. Matches the create-flow default. */
const DEFAULT_THEME_ID = "clean";

interface ThemeSectionProps {
  themeId?: string;
  onUpdate: FormUpdateFn;
  className?: string;
}

export function ThemeSection({ themeId, onUpdate, className }: ThemeSectionProps) {
  const selected = themeId ?? DEFAULT_THEME_ID;

  // Mocked single-slide decks, one per theme, rendered through the same
  // SlideThumbnail/applyTheme pipeline the editor uses — so the swatch is a
  // true preview, not a hand-picked colour chip that can drift from the theme.
  const themedCoverSlides = useMemo<CanvasSlide[]>(() => {
    return THEMES.map((theme) => {
      const bareSlide: CanvasSlide = {
        id: `mock-${theme.id}`,
        layout: "title",
        background: theme.bg,
        elements: [
          {
            id: "mock-title",
            type: "text",
            x: 0.10, y: 0.20, w: 0.80, h: 0.22,
            text: theme.name,
            fontSize: 0.052,
            fontStyle: "bold",
            color: "#ffffff",
            align: "center",
            role: "title",
          },
          {
            id: "mock-sub",
            type: "text",
            x: 0.10, y: 0.46, w: 0.80, h: 0.12,
            text: "Apresentação",
            fontSize: 0.026,
            fontStyle: "normal",
            color: "#ffffff",
            align: "center",
            role: "subtitle",
          },
        ],
      };
      const mockCanvas: CanvasPresentation = {
        schemaVersion: 2,
        documentType: "presentation",
        slides: [bareSlide],
      };
      return applyTheme(mockCanvas, theme.id).slides[0] ?? bareSlide;
    });
  }, []);

  return (
    <Card
      className={cn(
        "p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
    >
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Tema visual{" "}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                (Opcional)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {THEMES.find((t) => t.id === selected)?.name ?? "Branco"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {themedCoverSlides.map((slide, i) => {
            const theme = THEMES[i];
            if (!theme) return null;
            return (
              <SlideThumbnail
                key={theme.id}
                slide={slide}
                index={i}
                isActive={selected === theme.id}
                onClick={() => onUpdate("themeId", theme.id)}
                w={110}
                h={62}
                showIndex={false}
                ringOffset="ring-offset-card"
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
