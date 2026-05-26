"use client";

/**
 * ThemePicker — visual grid for choosing a presentation colour theme.
 *
 * Opens a Dialog (shadcn) with a 4-column grid of theme swatches.
 * Each swatch previews bg / title / body / accent colours as coloured bars.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { THEMES, type PresentationTheme } from "@/shared/types/presentation-theme";
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
        <DialogContent className="sm:max-w-sm">
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

/* --------------------------------------------------------------------------
 * ThemeSwatch — individual preview cell
 * -------------------------------------------------------------------------- */

function ThemeSwatch({
  theme,
  isActive,
  onSelect,
}: {
  theme: PresentationTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={theme.name}
      className={`flex flex-col overflow-hidden rounded-md transition-all outline-none ${
        isActive
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "ring-1 ring-border hover:ring-primary/50"
      }`}
    >
      {/* Mini slide preview */}
      <div
        className="flex flex-col gap-0.5 p-1.5"
        style={{
          backgroundColor: theme.bg,
          aspectRatio: "16/9",
        }}
      >
        {/* Title bar */}
        <div
          className="h-1.5 w-3/4 rounded-sm"
          style={{ backgroundColor: theme.titleColor }}
        />
        {/* Body lines */}
        <div
          className="h-1 w-full rounded-sm opacity-60"
          style={{ backgroundColor: theme.bodyColor }}
        />
        <div
          className="h-1 w-4/5 rounded-sm opacity-50"
          style={{ backgroundColor: theme.bodyColor }}
        />
        {/* Accent line */}
        <div
          className="mt-0.5 h-1 w-2/5 rounded-sm"
          style={{ backgroundColor: theme.accentColor }}
        />
      </div>

      {/* Theme name */}
      <div className="bg-card px-1 py-0.5 text-center text-[9px] font-medium text-muted-foreground">
        {theme.name}
      </div>
    </button>
  );
}
