"use client";

import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { cn } from "@/shared/utils/utils";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

const SELECTED_POP = { scale: [0.94, 1] };
const AT_REST = { scale: 1 };

interface ChoiceChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  /** Shows a check mark when selected, so selection never relies on colour alone. */
  showCheck?: boolean;
  className?: string;
}

/** Compact toggle chip (40px tap height on mobile, 36px on desktop) used across the onboarding steps; pops when selected. */
export function ChoiceChip({
  selected,
  onClick,
  children,
  disabled,
  showCheck = false,
  className,
}: ChoiceChipProps) {
  const { reduce } = useMotionSafe();

  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      animate={selected && !reduce ? SELECTED_POP : AT_REST}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      className={cn(
        "inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm sm:min-h-9 font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-accent",
        className,
      )}
    >
      {showCheck && selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="min-w-0">{children}</span>
    </motion.button>
  );
}
