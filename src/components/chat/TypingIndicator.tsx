"use client";

import { cn } from "@/shared/utils/utils";

export interface TypingIndicatorProps {
  /** Optional: Additional CSS classes */
  className?: string;
}

/**
 * Animated typing indicator with bouncing dots.
 * Shows when the AI is processing/generating a response.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        "bg-muted text-foreground mr-auto p-3 rounded-2xl rounded-tl-none border border-border/50 animate-in fade-in duration-300",
        className
      )}
    >
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
      </div>
    </div>
  );
}
