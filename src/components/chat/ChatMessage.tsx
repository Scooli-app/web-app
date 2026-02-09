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
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            components={{
              p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-2 list-disc pl-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 list-decimal pl-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
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
