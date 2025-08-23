"use client";

import { Card } from "@/frontend/components/ui/card";
import { useDocumentManager } from "@/frontend/hooks/useDocumentManager";
import { Routes } from "@/shared/types/routes";
import {
  clearPendingInitialPrompt,
  fetchDocument,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import RichTextEditor from "../ui/rich-text-editor";
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
  const dispatch = useAppDispatch();
  const { currentDocument, isLoading } = useAppSelector(
    (state) => state.documents
  );
  const {
    content,
    handleContentChange,
    handleTitleSave,
    isLoading: isSaving,
    editorKey,
  } = useDocumentManager(documentId);

  useEffect(() => {
    if (documentId) {
      dispatch(fetchDocument(documentId));
    }
  }, [dispatch, documentId]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: currentDocument?.content || "",
    editable: true,
    onUpdate: ({ editor }: { editor: Editor }) => {
      handleContentChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && currentDocument?.content) {
      editor.commands.setContent(currentDocument.content);
    }
  }, [editor, currentDocument?.content]);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [hasExecutedInitialPrompt, setHasExecutedInitialPrompt] =
    useState(false);

  const { pendingInitialPrompt, pendingDocumentId } = useAppSelector(
    (state) => state.documents
  );
  const executePrompt = useCallback(
    async (userMessage: string) => {
      if (!currentDocument) {
        return;
      }

      try {
        setIsStreaming(true);

        const response = await fetch(
          `/api/documents/${currentDocument?.id}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `${generateMessage}: ${userMessage}`,
              currentContent: currentDocument?.content || "",
            }),
          }
        );

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
          dispatch(clearPendingInitialPrompt());
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
      currentDocument,
      generateMessage,
      pendingInitialPrompt,
      pendingDocumentId,
      documentId,
      handleContentChange,
      dispatch,
    ]
  );
  // Handle initial prompt execution
  useEffect(() => {
    if (
      document &&
      !hasExecutedInitialPrompt &&
      !isStreaming &&
      pendingInitialPrompt &&
      pendingDocumentId === documentId &&
      (!currentDocument?.content || currentDocument?.content.trim() === "")
    ) {
      setHasExecutedInitialPrompt(true);

      // Add the initial prompt to chat history
      setChatHistory([{ role: "user", content: pendingInitialPrompt }]);

      // Execute the initial prompt through the chat system
      executePrompt(pendingInitialPrompt);
    }
  }, [
    documentId,
    pendingInitialPrompt,
    pendingDocumentId,
    hasExecutedInitialPrompt,
    isStreaming,
    executePrompt,
    currentDocument?.content,
  ]);

  useEffect(() => {
    if (error) {
      alert(error);
      setError("");
    }
  }, [error]);

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

        const response = await fetch(
          `/api/documents/${currentDocument?.id}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: userMessage,
              currentContent: content,
            }),
          }
        );

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
      <div className="flex-1 flex flex-col">
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
