"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  onChatSubmit: (message: string) => Promise<void>;
  chatHistory: ChatMessage[];
  isStreaming?: boolean;
  error?: string;
  placeholder?: string;
  title?: string;
}

function ChatContent({
  chatHistory,
  isStreaming,
  error,
  placeholder,
  title,
  chatMessage,
  setChatMessage,
  handleSubmit,
  chatContainerRef,
  variant = "desktop",
}: {
  chatHistory: ChatMessage[];
  isStreaming: boolean;
  error?: string;
  placeholder: string;
  title: string;
  chatMessage: string;
  setChatMessage: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  variant?: "desktop" | "mobile";
}) {
  const isDesktop = variant === "desktop";

  return (
    <Card
      className={`p-4 md:p-6 flex flex-col ${isDesktop ? "h-full min-h-[500px] max-h-[500px]" : "h-full border-0 shadow-none"}`}
    >
      {isDesktop && (
        <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      )}

      {/* Chat History */}
      <div
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto mb-4 space-y-4 ${isDesktop ? "h-[300px] md:h-[500px]" : "h-full"}`}
      >
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-xl ${
              message.role === "user"
                ? "bg-primary text-primary-foreground ml-8"
                : "bg-muted text-foreground mr-8"
            }`}
          >
            {message.content}
          </div>
        ))}

        {/* Typing Indicator */}
        {isStreaming && (
          <div className="bg-muted text-foreground mr-8 p-3 rounded-xl">
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-auto">
        <Input
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          disabled={!chatMessage.trim() || isStreaming}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl disabled:bg-muted disabled:text-muted-foreground"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-xl text-destructive text-sm">
          {error}
        </div>
      )}
    </Card>
  );
}

export default function AIChatPanel({
  onChatSubmit,
  chatHistory,
  isStreaming = false,
  error,
  placeholder = "Faça uma pergunta ou peça ajuda...",
  title = "AI Assistant",
}: AIChatPanelProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) {
      return;
    }

    const userMessage = chatMessage;
    setChatMessage("");
    await onChatSubmit(userMessage);
  };

  // Scroll chat to bottom when chatHistory changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
    if (mobileChatContainerRef.current) {
      mobileChatContainerRef.current.scrollTop =
        mobileChatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <>
      {/* Desktop: Fixed sidebar panel */}
      <div className="hidden lg:block lg:fixed lg:right-10 lg:top-30 lg:max-h-fit lg:w-[400px] z-30 flex-col border-l border-border bg-transparent">
        <ChatContent
          chatHistory={chatHistory}
          isStreaming={isStreaming}
          error={error}
          placeholder={placeholder}
          title={title}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          handleSubmit={handleSubmit}
          chatContainerRef={chatContainerRef}
          variant="desktop"
        />
      </div>

      {/* Mobile/Tablet: Floating button + Sheet */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
              size="icon"
            >
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
              {chatHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-medium">
                  {chatHistory.length > 9 ? "9+" : chatHistory.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:max-w-md p-0 flex flex-col"
          >
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-xl font-semibold text-foreground">
                {title}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden p-4">
              <ChatContent
                chatHistory={chatHistory}
                isStreaming={isStreaming}
                error={error}
                placeholder={placeholder}
                title={title}
                chatMessage={chatMessage}
                setChatMessage={setChatMessage}
                handleSubmit={handleSubmit}
                chatContainerRef={mobileChatContainerRef}
                variant="mobile"
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
