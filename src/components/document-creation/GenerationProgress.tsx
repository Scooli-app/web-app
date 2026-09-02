"use client";

import { cn } from "@/shared/utils/utils";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

interface GenerationProgressProps {
  title: string;
  subtitle: string;
  steps: readonly string[];
  currentStep: number;
}

/**
 * Shared "AI is working" full-step screen for creation wizards — a pulsing
 * progress bar plus a step checklist. Used by both calendar/novo and
 * curriculum-plan/novo so the post-submit wait feels the same in both.
 */
export function GenerationProgress({ title, subtitle, steps, currentStep }: GenerationProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-16">
      <div className="space-y-2 text-center">
        <Sparkles className="mx-auto h-12 w-12 animate-pulse text-primary" />
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="w-full max-w-sm space-y-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              {i < currentStep ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              ) : i === currentStep ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-muted" />
              )}
              <span
                className={cn(
                  "text-sm",
                  i < currentStep
                    ? "text-muted-foreground line-through"
                    : i === currentStep
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
