"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Card } from "@/components/ui/card";
import RichTextEditor from "@/components/ui/rich-text-editor";
import type { Document } from "@/lib/types";
import { useDocumentStore } from "@/stores/document.store";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

// Custom hook for document auto-save
function useAutoSave(
  document: Document | null, 
  content: string, 
  updateDocument: (data: { id: string; content: string }) => Promise<void>
) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedContent = useRef<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const saveContent = useCallback(async (newContent: string) => {
    if (!document || newContent === lastSavedContent.current) {
      return;
    }

    try {
      setIsSaving(true);
      await updateDocument({
        id: document.id,
        content: newContent,
      });
      lastSavedContent.current = newContent;
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [document, updateDocument]);

  useEffect(() => {
    if (!document || !content || content.trim() === "" || content === lastSavedContent.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveContent(content);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, saveContent]);

  useEffect(() => {
    if (document?.content) {
      lastSavedContent.current = document.content;
    }
  }, [document]);

  return { isSaving };
}

function useInitialPrompt(
  document: Document | null,
  documentId: string,
  generateMessage: string,
  onContentChange: (content: string) => void
) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const { pendingInitialPrompt, pendingDocumentId, clearPendingInitialPrompt } = useDocumentStore();

  const executePrompt = useCallback(async (prompt: string) => {
    if (!document || hasExecuted) {
      return;
    }

    try {
      setIsExecuting(true);
      setHasExecuted(true);

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
          message: `${generateMessage}: ${prompt}`,
          currentContent: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      if (data.generatedContent) {
        onContentChange(data.generatedContent);
      }

      clearPendingInitialPrompt();
    } catch (error) {
      console.error("Failed to execute initial prompt:", error);
      clearPendingInitialPrompt();
      setHasExecuted(false); // Allow retry
    } finally {
      setIsExecuting(false);
    }
  }, [document, hasExecuted, generateMessage, onContentChange, clearPendingInitialPrompt]);

  // Execute prompt when conditions are met
  useEffect(() => {
    const shouldExecute = 
      document &&
      !hasExecuted &&
      pendingInitialPrompt &&
      pendingDocumentId === documentId &&
      (!document.content || document.content.trim() === "");

    if (shouldExecute) {
      executePrompt(pendingInitialPrompt);
    }
  }, [document, hasExecuted, pendingInitialPrompt, pendingDocumentId, documentId, executePrompt]);

  return { isExecuting };
}

// Custom hook for document management
function useDocumentManager(documentId: string) {
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const { 
    fetchDocument, 
    updateDocument, 
    currentDocument, 
    isLoading: storeLoading 
  } = useDocumentStore();

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId, fetchDocument]);

  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content || "");
      setEditorKey((prev) => prev + 1);
    }
  }, [currentDocument]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleTitleSave = useCallback(async (newTitle: string) => {
    if (!currentDocument) {
      return;
    }

    try {
      await updateDocument({
        id: currentDocument.id,
        title: newTitle,
      });
    } catch (error) {
      console.error("Failed to save title:", error);
      throw error;
    }
  }, [currentDocument, updateDocument]);

  return {
    document: currentDocument,
    content,
    editorKey,
    isLoading: storeLoading,
    handleContentChange,
    handleTitleSave,
    updateDocument,
  };
}

export default function DocumentEditor({
  documentId,
  defaultTitle,
  loadingMessage,
  generateMessage,
  chatTitle = "AI Assistant",
  chatPlaceholder = "Faça uma pergunta ou peça ajuda...",
}: DocumentEditorProps) {
  const { user, loading } = useSupabase();
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6753FF] mx-auto mb-4" />
          <p className="text-[#6C6F80]">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
