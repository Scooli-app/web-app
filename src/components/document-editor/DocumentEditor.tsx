"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Card } from "@/components/ui/card";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { DocumentService } from "@/lib/services/document-service";
import type { Document } from "@/lib/types/documents";
import { useDocumentStore } from "@/stores/document.store";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [hasExecutedInitialPrompt, setHasExecutedInitialPrompt] =
    useState(false);

  const documentService = useRef(new DocumentService());
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedContent = useRef<string>("");

  const { pendingInitialPrompt, pendingDocumentId, clearPendingInitialPrompt } =
    useDocumentStore();

  // Load existing document
  useEffect(() => {
    if (documentId && !document) {
      loadDocument(documentId);
    }
  }, [documentId, document]);

  const loadDocument = async (id: string) => {
    try {
      setIsLoading(true);
      const doc = await documentService.current.getDocument(id);
      if (doc) {
        setDocument(doc);
        setContent(doc.content || "");
      } else {
        setError("Documento não encontrado");
      }
    } catch (error) {
      console.error("Failed to load document:", error);
      setError("Erro ao carregar o documento");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize lastSavedContent when document is loaded
  useEffect(() => {
    if (document && document.content) {
      lastSavedContent.current = document.content;
      setContent(document.content);
    }
  }, [document]);

  // Check for pending initial prompt and execute it once
  useEffect(() => {
    if (
      document &&
      !hasExecutedInitialPrompt &&
      pendingInitialPrompt &&
      pendingDocumentId === documentId &&
      (!document.content || document.content.trim() === "")
    ) {
      executeInitialPrompt(pendingInitialPrompt);
    }
  }, [
    document,
    pendingInitialPrompt,
    pendingDocumentId,
    documentId,
    hasExecutedInitialPrompt,
  ]);

  const executeInitialPrompt = async (prompt: string) => {
    if (!document) {
      return;
    }

    try {
      setIsStreaming(true);
      setHasExecutedInitialPrompt(true);

      // Get session and include token in request
      const supabase = createClientComponentClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
        setContent(data.generatedContent);
        setEditorKey((k) => k + 1);
        handleContentChange(data.generatedContent);
      }

      // Clear the pending prompt from store
      clearPendingInitialPrompt();
    } catch (error) {
      console.error("Failed to execute initial prompt:", error);
      setError("Erro ao gerar o conteúdo inicial");
      clearPendingInitialPrompt();
    } finally {
      setIsStreaming(false);
    }
  };

  // Save content when it changes
  useEffect(() => {
    if (
      document &&
      content &&
      content.trim() !== "" &&
      content !== lastSavedContent.current
    ) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          const updatedDoc = await documentService.current.updateDocument(
            document.id,
            {
              content,
            }
          );
          setDocument(updatedDoc);
          lastSavedContent.current = content; // Update last saved content
        } catch (_error) {
          setError("Erro ao guardar o documento");
        } finally {
          setIsSaving(false);
        }
      }, 2000); // Increased delay to 2 seconds
    }
  }, [content, document]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleTitleSave = async (newTitle: string) => {
    if (!document) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedDoc = await documentService.current.updateDocument(
        document.id,
        {
          title: newTitle,
        }
      );
      setDocument(updatedDoc);
    } catch (error) {
      console.error("Failed to save title:", error);
      setError("Erro ao guardar o título");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChatSubmit = async (userMessage: string) => {
    if (!document) {
      return;
    }

    setChatHistory((prev) => [...prev, { role: "user", content: userMessage }]);

    // Clear any previous errors when starting a new query
    setError("");

    try {
      setIsStreaming(true);

      // Get session and include token in request
      const supabase = createClientComponentClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

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

      let chatAnswer = "";
      let generatedContent = "";

      // Handle the JSON response
      if (data.chatAnswer) {
        chatAnswer = data.chatAnswer;
      }

      if (data.generatedContent) {
        generatedContent = data.generatedContent;
      }

      // Add chat answer to history if it exists
      if (chatAnswer) {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: chatAnswer },
        ]);
      }

      // Update document content if generated content exists
      if (generatedContent) {
        setContent(generatedContent);
        setEditorKey((k) => k + 1); // Force RichTextEditor to remount with new content
        handleContentChange(generatedContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setError("Erro na comunicação com o AI");
    } finally {
      setIsStreaming(false);
    }
  };

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
    return null; // Will redirect to login
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
  if (
    isStreaming &&
    hasExecutedInitialPrompt &&
    (!content || content.trim() === "")
  ) {
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

        {/* Responsive grid: editor wide, chat fixed on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 relative">
          {/* Editor Panel */}
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

          {/* Chat Panel */}
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
