"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/utils";
import { Send } from "lucide-react";
import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";

export interface ChatInputProps {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when message is submitted */
  onSubmit: () => void;
  /** Optional: Placeholder text */
  placeholder?: string;
  /** Optional: Disable input and button */
  disabled?: boolean;
  /** Optional: Additional CSS classes */
  className?: string;
}

/**
 * Chat input component with textarea and send button.
 * Supports Enter to send and Shift+Enter for new lines.
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Escreve uma mensagem...",
  disabled = false,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit();
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 bg-background/50 p-1.5 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-colors",
        className
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none border-0 bg-transparent focus:outline-none focus:ring-0 px-3 py-2 text-sm min-h-10 max-h-32 placeholder:text-muted-foreground"
      />
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        size="icon"
        className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
