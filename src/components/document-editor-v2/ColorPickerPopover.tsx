"use client";

/**
 * ColorPickerPopover — full color picker popover for the presentation toolbar.
 *
 * Uses react-colorful's HexColorPicker for the gradient/hue picker.
 * Shows recent-use swatches + a curated preset palette.
 */

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

const PRESET_COLORS = [
  // Row 1 — neutrals
  "#ffffff", "#e5e7eb", "#9ca3af", "#6b7280", "#374151", "#1f2937", "#111827", "#000000",
  // Row 2 — primates
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  // Row 3 — pastels
  "#fca5a5", "#fdba74", "#fde047", "#86efac", "#93c5fd", "#c4b5fd", "#f9a8d4", "#99f6e4",
];

interface Props {
  color: string;
  onChange: (color: string) => void;
  /** The trigger element (e.g. a small coloured circle button) */
  children: React.ReactNode;
}

export function ColorPickerPopover({ color, onChange, children }: Props) {
  const [open, setOpen] = useState(false);
  // AI-generated elements may return non-string color values — guard against it
  const safeColor = typeof color === "string" ? color : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-3 space-y-3"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Gradient + hue picker */}
        <HexColorPicker
          color={safeColor}
          onChange={onChange}
          style={{ width: "100%", height: 140 }}
        />

        {/* Hex input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">#</span>
          <HexColorInput
            color={safeColor}
            onChange={onChange}
            prefixed={false}
            className="h-7 w-full rounded border border-border bg-background px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {/* Live preview swatch */}
          <div
            className="h-7 w-7 flex-shrink-0 rounded border border-border"
            style={{ background: safeColor }}
          />
        </div>

        {/* Preset palette */}
        <div className="grid grid-cols-8 gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              title={c}
              className={`h-5 w-5 rounded-sm border transition-transform hover:scale-110 ${
                safeColor.toLowerCase() === c ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ background: c, boxShadow: c === "#ffffff" ? "inset 0 0 0 1px #e5e7eb" : undefined }}
              onClick={() => onChange(c)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
