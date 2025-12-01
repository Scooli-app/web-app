"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
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

export default function AIChatPanel({
  onChatSubmit,
  chatHistory,
  isStreaming = false,
  error,
  placeholder = "Faça uma pergunta ou peça ajuda...",
  title = "AI Assistant",
}: AIChatPanelProps) {
  const [chatMessage, setChatMessage] = useState("");
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

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
  }, [chatHistory]);

  return (
    <div className="lg:fixed lg:right-10 lg:top-30 lg:max-h-fit lg:w-[400px] md:w-[300px] w-full z-30 flex flex-col border-l border-[#E4E4E7] lg:rounded-none rounded-2xl overflow-hidden bg-transparent">
      <Card className="p-4 md:p-6 h-full flex flex-col min-h-[500px]">
        <h2 className="text-xl font-semibold text-[#0B0D17] mb-4">{title}</h2>

        {/* Chat History */}
        <div
          ref={chatContainerRef}
          className="flex-1 h-[300px] md:h-[500px] overflow-y-auto mb-4 space-y-4"
        >
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-xl ${
                message.role === "user"
                  ? "bg-[#6753FF] text-white ml-8"
                  : "bg-[#F4F5F8] text-[#2E2F38] mr-8"
              }`}
            >
              {message.content}
            </div>
          ))}

          {/* Typing Indicator */}
          {isStreaming && (
            <div className="bg-[#F4F5F8] text-[#2E2F38] mr-8 p-3 rounded-xl">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-[#6C6F80] rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-[#6C6F80] rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-[#6C6F80] rounded-full animate-bounce"
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
            className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-4 py-2 rounded-xl disabled:bg-gray-300 disabled:text-gray-500"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-[#FFECEC] border border-[#FF4F4F] rounded-xl text-[#FF4F4F] text-sm">
            {error}
          </div>
        )}
      </Card>
    </div>
  );
}
