"use client";

import { cn } from "@/shared/utils/utils";
import type { LucideIcon } from "lucide-react";

export interface StepperStep {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface StepperProps {
  steps: readonly StepperStep[];
  currentStepId: string;
  /** When provided, completed steps become clickable to navigate back. Omit for a read-only indicator. */
  onStepClick?: (stepId: string) => void;
}

/**
 * Shared step indicator for multi-step creation wizards (numbered icon
 * circles + connecting bars). Used by both curriculum-plan/novo and
 * calendar/novo instead of each maintaining its own copy.
 */
export function Stepper({ steps, currentStepId, onStepClick }: StepperProps) {
  const currentIdx = steps.findIndex((s) => s.id === currentStepId);
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const clickable = !!onStepClick && done;
        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(step.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary bg-primary/10 text-primary",
                clickable && "hover:bg-primary/20 cursor-pointer",
                !active && !done && "border-muted-foreground/30 text-muted-foreground/50 cursor-default"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(step.id)}
              className={cn(
                "ml-2 hidden text-sm font-medium sm:inline transition-colors",
                active && "text-foreground cursor-default",
                done && clickable && "text-primary hover:text-primary/80 cursor-pointer",
                done && !clickable && "text-primary cursor-default",
                !active && !done && "text-muted-foreground/50 cursor-default"
              )}
            >
              {step.label}
            </button>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px w-8 transition-colors sm:w-12",
                  idx < currentIdx ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
