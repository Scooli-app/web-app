"use client";

import { ChatInput, ChatMessage, TypingIndicator } from "@/components/chat";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils/utils";
import { Minus, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmptyState, WELCOME_MESSAGE } from "./EmptyState";

export interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface AssistantPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Callback to clear the conversation */
  onClear: () => void;
  /** Current messages in the conversation */
  messages: Message[];
  /** Whether the assistant is currently processing */
  isProcessing: boolean;
  /** Content currently being streamed */
  streamingContent: string;
  /** Current input value */
  inputValue: string;
  /** Callback when input changes */
  onInputChange: (value: string) => void;
  /** Callback when message is submitted */
  onSubmit: () => void;
  /** Optional: Additional CSS classes */
  className?: string;
}

/**
 * Floating chat panel for the Scooli Assistant.
 * Anchored to the floating button in the bottom-right corner.
 */
export function AssistantPanel({
  isOpen,
  onClose,
  onClear,
  messages,
  isProcessing,
  streamingContent,
  inputValue,
  onInputChange,
  onSubmit,
  className,
}: AssistantPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  // Auto-scroll to bottom when messages change or panel opens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)]",
        "bg-card border border-border rounded-2xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Assistente Scooli</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => messages.length > 0 && onClear()}
                  className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    messages.length > 0 
                      ? "hover:bg-muted cursor-pointer" 
                      : "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                  aria-disabled={messages.length === 0}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novo chat</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full hover:bg-muted"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Minimizar chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isEmpty ? (
          <EmptyState
            disabled={isProcessing}
            onQuickAction={(message) => {
              if (isProcessing) return;
              onInputChange(message);
            }}
            onQuickActionSubmit={(message) => {
              if (isProcessing) return;
              onInputChange(message);
              // Small delay to allow state update before submit
              setTimeout(() => onSubmit(), 50);
            }}
          />
        ) : (
          <>
            {/* Welcome message as first assistant message */}
            <ChatMessage role="assistant" content={WELCOME_MESSAGE} />

            {/* Conversation messages */}
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                role={message.role}
                content={message.content}
                isStreaming={message.isStreaming}
              />
            ))}

            {/* Streaming message */}
            {streamingContent && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                isStreaming={true}
              />
            )}

            {/* Typing indicator when processing but no content yet */}
            {isProcessing && !streamingContent && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border bg-background/50">
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={isProcessing}
          placeholder="Escreve uma mensagem..."
        />
      </div>
    </div>
  );
}
