"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/utils";
import { Bot, Loader2 } from "lucide-react";

export interface AssistantButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;
  /** Whether the assistant is currently processing a message */
  isProcessing?: boolean;
  /** Whether there are unread messages from the assistant */
  hasUnread?: boolean;
  /** Optional: Additional CSS classes */
  className?: string;
}

/**
 * Floating action button for the Scooli Assistant.
 * Positioned in the bottom-right corner of the screen.
 */
export function AssistantButton({
  onClick,
  isProcessing = false,
  hasUnread = false,
  className,
}: AssistantButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "hover:shadow-xl hover:shadow-primary/25 hover:scale-105 active:scale-95",
        isProcessing && "animate-pulse",
        className
      )}
      size="icon"
      aria-label="Abrir Assistente Scooli"
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Bot className="h-6 w-6" />
      )}
      
      {/* Unread notification badge */}
      {hasUnread && !isProcessing && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive ring-2 ring-background animate-in zoom-in duration-200" />
      )}
    </Button>
  );
}
