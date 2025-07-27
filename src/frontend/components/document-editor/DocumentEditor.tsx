"use client";


import { Card } from "@/frontend/components/ui/card";
import RichTextEditor from "@/frontend/components/ui/rich-text-editor";
import { useAutoSave } from "@/frontend/hooks/useAutoSave";
import { useDocumentManager } from "@/frontend/hooks/useDocumentManager";
import { useInitialPrompt } from "@/frontend/hooks/useInitialPrompt";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AIChatPanel from "./AIChatPanel";
import DocumentTitle from "./DocumentTitle";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DocumentEditorProps {
  documentId: string;
  defaultTitle: string;
  loadingMessage: string;
  generateMessage: string;
  chatTitle?: string;
  chatPlaceholder?: string;
}

export default function DocumentEditor({
  documentId,
  defaultTitle,
  loadingMessage,
  generateMessage,
  chatTitle = "AI Assistant",
  chatPlaceholder = "Faça uma pergunta ou peça ajuda...",
}: DocumentEditorProps) {

  const router = useRouter();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");

  const { 
    document, 
    content, 
    editorKey, 
    isLoading, 
    handleContentChange, 
    handleTitleSave, 
    updateDocument 
  } = useDocumentManager(documentId);

  const { isSaving } = useAutoSave(document, content, updateDocument);
  const { isExecuting } = useInitialPrompt(document, documentId, generateMessage, handleContentChange);

  const handleChatSubmit = useCallback(async (userMessage: string) => {
    if (!document) {
      return;
    }

    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setError("");

    try {
      setIsStreaming(true);

      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/documents/${document.id}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: userMessage,
          currentContent: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      if (data.chatAnswer) {
        setChatHistory(prev => [
          ...prev,
          { role: "assistant", content: data.chatAnswer },
        ]);
      }

      if (data.generatedContent) {
        handleContentChange(data.generatedContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setError("Erro na comunicação com o AI");
    } finally {
      setIsStreaming(false);
    }
  }, [document, content, handleContentChange]);

  // Loading states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6753FF] mx-auto mb-4" />
          <p className="text-[#6C6F80]">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0B0D17] mb-4">
            Documento não encontrado
          </h1>
          <p className="text-[#6C6F80] mb-4">
            O documento que procura não existe ou não tem permissão para aceder.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[#6753FF] text-white px-4 py-2 rounded-xl hover:bg-[#4E3BC0] transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show loading state when executing initial prompt
  if (isExecuting && (!content || content.trim() === "")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6753FF] mx-auto mb-4" />
          <p className="text-[#6C6F80]">A gerar o seu conteúdo...</p>
          <p className="text-sm text-[#6C6F80] mt-2">
            Isto pode demorar alguns segundos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0FF] p-2 md:p-6">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <DocumentTitle
            title={document?.title || ""}
            onSave={handleTitleSave}
            isSaving={isSaving}
            defaultTitle={defaultTitle}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 relative">
          <Card className="p-4 md:p-6 w-full min-w-0">
            <h2 className="text-xl font-semibold text-[#0B0D17] mb-4">
              Editor
            </h2>
            <RichTextEditor
              key={editorKey}
              content={content}
              onChange={handleContentChange}
              className="min-h-[600px] max-w-full"
            />
          </Card>

          <AIChatPanel
            onChatSubmit={handleChatSubmit}
            chatHistory={chatHistory}
            isStreaming={isStreaming}
            error={error}
            title={chatTitle}
            placeholder={chatPlaceholder}
          />
        </div>
      </div>
    </div>
  );
}
