"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { DocumentService } from "@/lib/services/document-service";
import type { Document } from "@/lib/types/documents";
import { Loader2, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LessonPlanEditorProps {
  documentId?: string;
}

export default function LessonPlanEditor({
  documentId,
}: LessonPlanEditorProps) {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [showEditor, setShowEditor] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");

  const documentService = useRef(new DocumentService());
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedContent = useRef<string>("");

  // Load existing document if documentId is provided
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
        setShowEditor(true);
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

  const handleCreateDocument = async () => {
    if (!initialPrompt.trim()) {
      setError("Por favor, introduza uma descrição do plano de aula");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const newDocument = await documentService.current.createDocument({
        title: `Plano de Aula - ${new Date().toLocaleDateString("pt-PT")}`,
        content: "",
        document_type: "lesson_plan",
        metadata: {
          initial_prompt: initialPrompt,
        },
      });

      setDocument(newDocument);
      setShowEditor(true);
    } catch (error) {
      console.error("Failed to create document:", error);

      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes("not authenticated")) {
          setError("Erro de autenticação. Por favor, faça login novamente.");
        } else if (error.message.includes("violates row-level security")) {
          setError("Erro de permissão. Verifique se está autenticado.");
        } else {
          setError(`Erro ao criar o documento: ${error.message}`);
        }
      } else {
        setError("Erro ao criar o documento. Verifique se está autenticado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !document) {
      return;
    }

    const userMessage = chatMessage;
    setChatMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMessage }]);

    // Clear any previous errors when starting a new query
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

  if (!showEditor) {
    return (
      <div className="min-h-screen bg-[#EEF0FF] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#0B0D17] mb-4">
              Criar Plano de Aula
            </h1>
            <p className="text-lg text-[#6C6F80]">
              Descreva o que pretende criar e o AI irá ajudá-lo a desenvolver um
              plano de aula completo
            </p>
          </div>

          <Card className="p-8">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="prompt"
                  className="block text-sm font-medium text-[#2E2F38] mb-2"
                >
                  Descrição do Plano de Aula
                </label>
                <textarea
                  id="prompt"
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="Ex: Preciso de um plano de aula para ensinar frações a alunos do 4º ano, com atividades práticas e exercícios..."
                  className="w-full p-4 border border-[#C7C9D9] rounded-xl bg-[#F4F5F8] text-[#2E2F38] placeholder:text-[#6C6F80] focus:outline-none focus:ring-2 focus:ring-[#6753FF] resize-none"
                  rows={6}
                />
              </div>

              {error && (
                <div className="p-4 bg-[#FFECEC] border border-[#FF4F4F] rounded-xl text-[#FF4F4F]">
                  {error}
                </div>
              )}

              <Button
                onClick={handleCreateDocument}
                disabled={isLoading || !initialPrompt.trim()}
                className="w-full bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-6 py-3 rounded-xl font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />A criar
                    documento...
                  </>
                ) : (
                  "Criar Plano de Aula"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0FF] p-2 md:p-6">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#0B0D17]">
            {document?.title || "Plano de Aula"}
          </h1>
          {isSaving && (
            <div className="flex items-center text-[#6C6F80]">
              <Save className="h-4 w-4 mr-2" />
              <span className="text-sm">A guardar...</span>
            </div>
          )}
        </div>

        {/* Responsive grid: editor wide, chat fixed on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 relative">
          {/* Editor Panel */}
          <Card className="p-4 md:p-6 w-full min-w-0">
            <h2 className="text-xl font-semibold text-[#0B0D17] mb-4">
              Editor
            </h2>
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              className="min-h-[600px] max-w-full"
            />
          </Card>

          {/* Chat Panel - fixed on desktop, static on mobile */}
          <div className="lg:fixed lg:right-10 lg:top-10 lg:max-h-fit lg:w-[400px] w-full z-30 flex flex-col border-l border-[#E4E4E7] shadow-md lg:rounded-none rounded-2xl overflow-hidden">
            <Card className="p-4 md:p-6 h-full flex flex-col">
              <h2 className="text-xl font-semibold text-[#0B0D17] mb-4">
                AI Assistant
              </h2>

              {/* Chat History */}
              <div className="flex-1 h-[300px] md:h-[500px] overflow-y-auto mb-4 space-y-4">
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
              </div>

              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="flex gap-2 mt-auto">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Faça uma pergunta ou peça ajuda..."
                  className="flex-1"
                  disabled={isStreaming}
                />
                <Button
                  type="submit"
                  disabled={!chatMessage.trim() || isStreaming}
                  className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-4 py-2 rounded-xl"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {error && (
                <div className="mt-4 p-3 bg-[#FFECEC] border border-[#FF4F4F] rounded-xl text-[#FF4F4F] text-sm">
                  {error}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
