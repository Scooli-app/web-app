"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/utils/utils";
import { Check, ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectPopoverProps {
  options: MultiSelectOption[];
  values: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  /** Summary shown in the trigger when more than one option is picked ("3 selected"). */
  countLabel: (count: number) => string;
  /** id of the element that labels the trigger. */
  labelledBy: string;
}

/**
 * Compact multi-select for the onboarding steps, which never scroll: the long option
 * list lives in a popover (scrolls inside itself) instead of a wall of chips.
 */
export function MultiSelectPopover({
  options,
  values,
  onToggle,
  placeholder,
  countLabel,
  labelledBy,
}: MultiSelectPopoverProps) {
  const selected = options.filter((option) => values.includes(option.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-labelledby={labelledBy}
          className="flex h-10 w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-input bg-card px-3 text-left text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className={cn("min-w-0 flex-1 truncate", selected.length === 0 && "text-muted-foreground")}>
            {selected.length === 0
              ? placeholder
              : selected.length === 1
                ? selected[0].label
                : countLabel(selected.length)}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      {/* The onboarding overlay sits at z-[9999]; the popover is portalled and must clear it. */}
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="z-[10000] max-h-[min(20rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-y-auto p-1"
      >
        <ul className="space-y-0.5">
          {options.map((option) => {
            const isSelected = values.includes(option.id);
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => onToggle(option.id)}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    isSelected && "font-medium text-primary",
                  )}
                >
                  <span className="min-w-0">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
