"use client";

/**
 * ThemePicker — "Tema" button + modal for choosing a presentation theme.
 *
 * The modal body is `ThemeGallery`, exported so other surfaces (e.g. the
 * creation form) can render the same filterable grid of described cards:
 * filter chips by audience (Inclusão / Escuros / Claros / Divertidos) and,
 * per theme, a slide preview in the theme's own fonts, its name and a
 * one-line description.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  THEME_GROUPS,
  THEMES,
  themeToCssGradient,
  translateThemeName,
  type PresentationTheme,
  type ThemeGroup,
} from "@/shared/types/presentation-theme";
import { cn } from "@/shared/utils/utils";
import { Check, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

interface Props {
  currentThemeId?: string;
  onSelect: (themeId: string) => void;
}

export function ThemePicker({ currentThemeId, onSelect }: Props) {
  const t = useTranslations("editor.themePicker");
  const [open, setOpen] = useState(false);

  const handleSelect = (themeId: string) => {
    onSelect(themeId);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Palette className="mr-2 h-4 w-4" />
        {t("themeButtonLabel")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("chooseThemeTitle")}</DialogTitle>
          </DialogHeader>

          {/* Padding lives here (DialogContent has none) so the selected
              card's ring is not clipped by the scrolling container. */}
          <ThemeGallery
            className="p-6 pt-4"
            value={currentThemeId ?? "dark"}
            onSelect={handleSelect}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ThemeGallery — filter chips + grid of described theme cards
 * ─────────────────────────────────────────────────────────────────────────── */

type ThemeFilter = "all" | ThemeGroup;

export function ThemeGallery({
  value,
  onSelect,
  className,
}: {
  value: string;
  onSelect: (themeId: string) => void;
  className?: string;
}) {
  const t = useTranslations("editor.themePicker");
  const [filter, setFilter] = useState<ThemeFilter>("all");

  const filters: ThemeFilter[] = ["all", ...THEME_GROUPS];
  const visibleThemes =
    filter === "all" ? THEMES : THEMES.filter((theme) => theme.groups.includes(filter));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="group"
        aria-label={t("filterLabel")}
        className="flex flex-wrap gap-2"
      >
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {t(f)}
          </button>
        ))}
      </div>

      {filter === "inclusion" && (
        <p className="text-sm text-muted-foreground">{t("inclusionHint")}</p>
      )}

      <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3">
        {visibleThemes.map((theme) => (
          <li key={theme.id}>
            <ThemeCard
              theme={theme}
              description={t(`descriptions.${theme.id}`)}
              isActive={theme.id === value}
              onSelect={() => onSelect(theme.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ThemeCard — slide preview + name + description
 * ─────────────────────────────────────────────────────────────────────────── */

/** next/font CSS variables (see app/layout.tsx) keyed by the theme's family name. */
const FONT_VARS: Record<string, string> = {
  Lexend: "var(--font-lexend-variable)",
  Poppins: "var(--font-poppins)",
  Montserrat: "var(--font-montserrat)",
  Raleway: "var(--font-raleway)",
  Lato: "var(--font-lato)",
  Merriweather: "var(--font-merriweather)",
  Nunito: "var(--font-nunito)",
};

function previewFont(stack: string): string {
  const family = stack.split(",")[0].trim();
  const cssVar = FONT_VARS[family];
  return cssVar ? `${cssVar}, ${stack}` : stack;
}

function ThemeCard({
  theme,
  description,
  isActive,
  onSelect,
}: {
  theme: PresentationTheme;
  description: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const name = translateThemeName(theme.id);
  const uid = useId();
  const nameId = `${uid}-name`;
  const descriptionId = `${uid}-desc`;
  const background = theme.bgGradient
    ? themeToCssGradient(theme.bgGradient)
    : theme.bg;
  const swatchDecos = theme.coverDecorations ?? theme.decorations ?? [];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      aria-labelledby={nameId}
      aria-describedby={descriptionId}
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "border-primary ring-2 ring-primary"
          : "border-border hover:border-primary/60 hover:shadow-md",
      )}
    >
      {/* Slide preview — decorative, the name/description below carry the meaning */}
      <div
        aria-hidden="true"
        className="relative w-full overflow-hidden border-b border-border"
        style={{ background, aspectRatio: "16/9" }}
      >
        {swatchDecos.map((deco, i) => (
          <div
            key={i}
            className="pointer-events-none absolute"
            style={buildDecoStyle(deco, theme.accentColor)}
          />
        ))}

        <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-[12%]">
          <span
            className="truncate text-lg font-bold leading-tight"
            style={{ color: theme.titleColor, fontFamily: previewFont(theme.titleFont) }}
          >
            {name}
          </span>
          <span
            className="truncate text-xs leading-snug"
            style={{ color: theme.bodyColor, fontFamily: previewFont(theme.bodyFont) }}
          >
            Aa Bb Cc 123
          </span>
          <span
            className="mt-1 h-1 w-8 rounded-full"
            style={{ backgroundColor: theme.accentColor }}
          />
        </div>

        {isActive && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 px-3 py-2.5">
        <span id={nameId} className="text-sm font-semibold text-card-foreground">
          {name}
        </span>
        <span id={descriptionId} className="text-xs leading-snug text-muted-foreground">
          {description}
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
      ? `${Math.max(1, Math.round((deco.strokeWidth ?? 0) * 280))}px solid ${deco.stroke}`
      : undefined,
    transform: deco.rotation ? `rotate(${deco.rotation}deg)` : undefined,
  };
}
