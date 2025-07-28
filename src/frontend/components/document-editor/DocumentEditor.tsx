"use client";

import { Card } from "@/frontend/components/ui/card";
import RichTextEditor from "@/frontend/components/ui/rich-text-editor";
import { useAutoSave } from "@/frontend/hooks/useAutoSave";
import { useDocumentManager } from "@/frontend/hooks/useDocumentManager";
import { useDocumentStore } from "@/frontend/stores/document.store";

import { Routes } from "@/shared/types/routes";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AIChatPanel from "./AIChatPanel";
import DocumentTitle from "./DocumentTitle";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DocumentEditorProps {
  documentId: string;
  defaultTitle?: string;
  loadingMessage?: string;
  generateMessage?: string;
  chatTitle?: string;
  chatPlaceholder?: string;
}

export default function DocumentEditor({
  documentId,
  defaultTitle = "Novo Documento",
  loadingMessage = "A carregar documento...",
  generateMessage = "Gerar conteúdo",
  chatTitle = "AI Assistant",
  chatPlaceholder = "Faça uma pergunta ou peça ajuda...",
}: DocumentEditorProps) {
  const router = useRouter();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [hasExecutedInitialPrompt, setHasExecutedInitialPrompt] =
    useState(false);

  const {
    document,
    content,
    editorKey,
    isLoading,
    handleContentChange,
    handleTitleSave,
    updateDocument,
  } = useDocumentManager(documentId);

  const { isSaving } = useAutoSave(document, content, updateDocument);

  const { pendingInitialPrompt, pendingDocumentId, clearPendingInitialPrompt } =
    useDocumentStore();

  // Handle initial prompt execution
  useEffect(() => {
    if (
      document &&
      !hasExecutedInitialPrompt &&
      !isStreaming &&
      pendingInitialPrompt &&
      pendingDocumentId === documentId &&
      (!document.content || document.content.trim() === "")
    ) {
      setHasExecutedInitialPrompt(true);

      // Add the initial prompt to chat history
      setChatHistory([{ role: "user", content: pendingInitialPrompt }]);

      // Execute the initial prompt through the chat system
      executePrompt(pendingInitialPrompt);
    }
  }, [
    document,
    documentId,
    pendingInitialPrompt,
    pendingDocumentId,
    hasExecutedInitialPrompt,
    isStreaming,
  ]);

  const executePrompt = useCallback(
    async (userMessage: string) => {
      if (!document) {
        return;
      }

      try {
        setIsStreaming(true);
        setError("");

        const response = await fetch(`/api/documents/${document.id}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `${generateMessage}: ${userMessage}`,
            currentContent: content,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`);
        }

        const data = await response.json();

        if (data.generatedContent) {
          handleContentChange(data.generatedContent);
        }

        if (data.chatAnswer) {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: data.chatAnswer },
          ]);
        }

        // Clear pending prompt after successful execution
        if (pendingInitialPrompt && pendingDocumentId === documentId) {
          clearPendingInitialPrompt();
        }
      } catch (error) {
        console.error("Failed to execute prompt:", error);
        setError("Erro ao gerar conteúdo. Tente novamente.");

        // If it was an initial prompt, clear it to allow retry
        if (pendingInitialPrompt && pendingDocumentId === documentId) {
          clearPendingInitialPrompt();
          setHasExecutedInitialPrompt(false);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [
      document,
      content,
      generateMessage,
      handleContentChange,
      pendingInitialPrompt,
      pendingDocumentId,
      documentId,
      clearPendingInitialPrompt,
    ]
  );

  const handleChatSubmit = useCallback(
    async (userMessage: string) => {
      if (!document) {
        return;
      }

      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
      ]);
      setError("");

      try {
        setIsStreaming(true);

        const response = await fetch(`/api/documents/${document.id}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            currentContent: content,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`);
        }

        const data = await response.json();

        if (data.generatedContent) {
          handleContentChange(data.generatedContent);
        }

        if (data.chatAnswer) {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: data.chatAnswer },
          ]);
        }
      } catch (error) {
        console.error("Chat error:", error);
        setError("Erro ao enviar mensagem. Tente novamente.");
      } finally {
        setIsStreaming(false);
      }
    },
    [document, content, handleContentChange]
  );

  // Loading states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#6753FF]" />
          <span className="text-lg text-[#6C6F80]">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="text-center">
          <p className="text-lg text-[#6C6F80] mb-4">
            Documento não encontrado
          </p>
          <button
            onClick={() => router.push(Routes.DOCUMENTS)}
            className="text-[#6753FF] hover:underline"
          >
            Voltar aos documentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DocumentTitle
          title={document.title}
          defaultTitle={defaultTitle}
          onSave={handleTitleSave}
          isSaving={isSaving}
        />

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
        </div>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel
        onChatSubmit={handleChatSubmit}
        chatHistory={chatHistory}
        isStreaming={isStreaming}
        error={error}
        placeholder={chatPlaceholder}
        title={chatTitle}
      />
    </>
  );
}
