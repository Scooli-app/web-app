"use client";

import { cn } from "@/shared/utils/utils";
import type { LucideIcon } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * A single-choice switch between a few mutually exclusive options. Exposed as
 * a radiogroup with roving focus, so arrow keys move between options.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const nextIndex = (index + step + options.length) % options.length;
    onChange(options[nextIndex].value);
    buttonsRef.current[nextIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1", className)}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-xs sm:text-sm",
              isSelected
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className={cn("shrink-0", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
