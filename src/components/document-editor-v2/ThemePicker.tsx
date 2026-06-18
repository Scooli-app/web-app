"use client";

/**
 * ThemePicker — visual grid for choosing a presentation theme.
 *
 * Shows a 4×4 grid of rich swatches that preview gradient backgrounds,
 * decorative accents, font names and colour palette.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  THEMES,
  themeToCssGradient,
  type PresentationTheme,
} from "@/shared/types/presentation-theme";
import { Palette } from "lucide-react";
import { useState } from "react";

interface Props {
  currentThemeId?: string;
  onSelect: (themeId: string) => void;
}

export function ThemePicker({ currentThemeId, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (themeId: string) => {
    onSelect(themeId);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Palette className="mr-2 h-4 w-4" />
        Tema
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Escolher tema</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-3 p-1 pb-2">
            {THEMES.map((theme) => (
              <ThemeSwatch
                key={theme.id}
                theme={theme}
                isActive={theme.id === (currentThemeId ?? "dark")}
                onSelect={() => handleSelect(theme.id)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ThemeSwatch — individual preview card
 * ─────────────────────────────────────────────────────────────────────────── */

function ThemeSwatch({
  theme,
  isActive,
  onSelect,
}: {
  theme: PresentationTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  const background = theme.bgGradient
    ? themeToCssGradient(theme.bgGradient)
    : theme.bg;

  /** Extract the first font name (before any comma) for display. */
  const fontLabel = theme.titleFont.split(",")[0].trim();

  /** Cover decorations for the swatch preview. */
  const swatchDecos = (theme.coverDecorations ?? theme.decorations) ?? [];

  return (
    <button
      type="button"
      onClick={onSelect}
      title={theme.name}
      className={`flex flex-col overflow-hidden rounded-lg transition-all outline-none ${
        isActive
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.03]"
          : "ring-1 ring-border hover:ring-primary/60 hover:scale-[1.02]"
      }`}
    >
      {/* Slide preview */}
      <div
        className="relative overflow-hidden"
        style={{ background, aspectRatio: "16/9" }}
      >
        {/* Decoration accents — render all shapes so the swatch is representative */}
        {swatchDecos.map((deco, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={buildDecoStyle(deco, theme.accentColor)}
          />
        ))}

        {/* Mock content */}
        <div className="absolute inset-0 flex flex-col justify-center px-[18%] gap-[4%]">
          {/* Title bar */}
          <div
            className="h-[10%] w-[70%] rounded-sm"
            style={{ backgroundColor: theme.titleColor, opacity: 0.95 }}
          />
          {/* Subtitle */}
          <div
            className="h-[6%] w-[45%] rounded-sm"
            style={{ backgroundColor: theme.mutedColor, opacity: 0.7 }}
          />
          {/* Body lines */}
          <div className="flex flex-col gap-[3%] mt-[2%]">
            <div
              className="h-[5%] w-[85%] rounded-sm"
              style={{ backgroundColor: theme.bodyColor, opacity: 0.55 }}
            />
            <div
              className="h-[5%] w-[65%] rounded-sm"
              style={{ backgroundColor: theme.bodyColor, opacity: 0.45 }}
            />
          </div>
          {/* Accent dot */}
          <div
            className="h-[6%] w-[25%] rounded-sm mt-[1%]"
            style={{ backgroundColor: theme.accentColor, opacity: 0.9 }}
          />
        </div>
      </div>

      {/* Label row */}
      <div className="bg-card flex items-center justify-between px-2 py-1 gap-1">
        <span className="text-[10px] font-semibold text-card-foreground truncate">
          {theme.name}
        </span>
        <span className="text-[8px] text-muted-foreground truncate shrink-0">
          {fontLabel}
        </span>
      </div>
    </button>
  );
}

/** Convert a ThemeDecoration into a CSS style object for the swatch preview. */
function buildDecoStyle(
  deco: NonNullable<PresentationTheme["decorations"]>[number],
  fallbackColor: string,
): React.CSSProperties {
  const fill = deco.fill ?? fallbackColor;
  const isTransparent = fill === "none" || fill === "transparent";
  const isEllipse = deco.shape === "ellipse";
  const hasStroke = deco.stroke && deco.stroke !== "none" && deco.strokeWidth;

  return {
    left: `${deco.x * 100}%`,
    top: `${deco.y * 100}%`,
    width: `${deco.w * 100}%`,
    height: `${deco.h * 100}%`,
    backgroundColor: isTransparent ? "transparent" : fill,
    borderRadius: isEllipse ? "50%" : `${deco.cornerRadius ?? 0}px`,
    border: hasStroke
      ? `${Math.max(1, Math.round((deco.strokeWidth ?? 0) * 140))}px solid ${deco.stroke}`
      : undefined,
    transform: deco.rotation ? `rotate(${deco.rotation}deg)` : undefined,
    willChange: "transform",
  };
}
