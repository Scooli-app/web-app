"use client";

import { cn } from "@/shared/utils/utils";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

export interface ChatMessageProps {
  /** Message sender role */
  role: "user" | "assistant";
  /** Message content - supports markdown for assistant messages */
  content: string;
  /** Optional: Show "document updated" indicator */
  hasUpdate?: boolean;
  /** Optional: Message is currently being streamed */
  isStreaming?: boolean;
  /** Optional: Additional CSS classes */
  className?: string;
}

/**
 * Reusable chat message bubble component.
 * Renders user messages as plain text and assistant messages with markdown support.
 */
export function ChatMessage({
  role,
  content,
  hasUpdate,
  isStreaming,
  className,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-2xl text-sm leading-relaxed max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
        role === "user"
          ? "bg-primary text-primary-foreground ml-auto rounded-tr-none"
          : "bg-muted text-foreground mr-auto rounded-tl-none border border-border/50",
        className
      )}
    >
      {role === "assistant" ? (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2">
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{content}</ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />
          )}
        </div>
      ) : (
        <span className="whitespace-pre-wrap">{content}</span>
      )}

      {hasUpdate && (
        <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
          <Sparkles className="w-3 h-3" />
          Documento Refinado
        </div>
      )}
    </div>
  );
}
