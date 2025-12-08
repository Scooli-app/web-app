"use client";

import { Card } from "@/components/ui/card";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { streamDocumentContent } from "@/services/api/document.service";
import { Routes } from "@/shared/types";
import {
  clearStreamInfo,
  fetchDocument,
  chatWithDocument,
  clearLastChatAnswer,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import RichTextEditor from "../ui/rich-text-editor";
import { StreamingText } from "../ui/streaming-text";
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
  chatTitle = "AI Assistant",
  chatPlaceholder = "Faça uma pergunta ou peça ajuda...",
}: DocumentEditorProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentDocument, isLoading, streamInfo, isChatting, lastChatAnswer } =
    useAppSelector((state) => state.documents);
  const {
    content,
    setContent,
    handleContentChange,
    handleTitleSave,
    isLoading: isSaving,
    editorKey,
  } = useDocumentManager(documentId);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [displayContent, setDisplayContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const eventSourceRef = useRef<(() => void) | null>(null);
  const rawStreamRef = useRef("");
  const accumulatedTitleRef = useRef("");

  // Extract generatedContent from partial JSON stream
  const extractGeneratedContent = (jsonStr: string): string => {
    // Look for "generatedContent": " pattern and extract content after it
    const match = jsonStr.match(/"generatedContent":\s*"([\s\S]*?)(?:"|$)/);
    if (match && match[1]) {
      // Unescape JSON string
      return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return "";
  };

  // Connect to SSE stream when we have stream info for this document
  useEffect(() => {
    // Only connect if we have stream info for this document and aren't already streaming
    if (
      streamInfo &&
      streamInfo.id === documentId &&
      streamInfo.status === "generating" &&
      !eventSourceRef.current
    ) {
      setIsStreaming(true);
      rawStreamRef.current = "";
      accumulatedTitleRef.current = "";
      setDisplayContent("");
      setDocumentTitle("");

      const cleanup = streamDocumentContent(streamInfo.streamUrl, {
        onContent: (chunk) => {
          // Accumulate raw content (it's JSON being streamed)
          rawStreamRef.current += chunk;
          // Extract and display generatedContent as it streams
          const extracted = extractGeneratedContent(rawStreamRef.current);
          if (extracted) {
            setDisplayContent(extracted);
          }
        },
        onTitle: (titleChunk) => {
          // Accumulate title chunks character by character
          accumulatedTitleRef.current += titleChunk;
          setDocumentTitle(accumulatedTitleRef.current);
        },
        onComplete: (docId, response) => {
          eventSourceRef.current = null;
          
          // Preserve the streamed title before clearing streaming state
          const finalStreamedTitle = accumulatedTitleRef.current;
          if (finalStreamedTitle) {
            setDocumentTitle(finalStreamedTitle);
          }
          
          setIsStreaming(false);

          // Add chatAnswer to chat history
          const chatAnswer = response.chatAnswer;
          if (chatAnswer) {
            setChatHistory((prev) => [
              ...prev,
              { role: "assistant" as const, content: chatAnswer },
            ]);
          }

          // Set generatedContent to editor
          const generatedContent = response.generatedContent;
          if (generatedContent) {
            setContent(generatedContent);
          }

          dispatch(clearStreamInfo());
          dispatch(fetchDocument(docId));
        },
        onError: (errorMsg) => {
          eventSourceRef.current = null;
          setIsStreaming(false);
          setError(errorMsg);
          dispatch(clearStreamInfo());
        },
      });

      eventSourceRef.current = cleanup;
    }

    // Cleanup only when component fully unmounts or documentId changes
    return () => {
      // Don't cleanup on every re-render, only when we're actually leaving
    };
  }, [streamInfo, documentId, dispatch, setContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current();
        eventSourceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (error) {
      alert(error);
      setError("");
    }
  }, [error]);

  // Handle chat answer from Redux
  useEffect(() => {
    if (lastChatAnswer) {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant" as const, content: lastChatAnswer },
      ]);
      dispatch(clearLastChatAnswer());
    }
  }, [lastChatAnswer, dispatch]);

  // Sync content when currentDocument changes (after chat updates)
  useEffect(() => {
    if (currentDocument?.content && !isStreaming) {
      setContent(currentDocument.content);
    }
  }, [currentDocument?.content, currentDocument?.updatedAt, isStreaming, setContent]);

  useEffect(() => {
    if (currentDocument?.title && !isStreaming) {
      if (!documentTitle || currentDocument.title === documentTitle || currentDocument.title.length >= documentTitle.length) {
        setDocumentTitle(currentDocument.title);
      }
    }
  }, [currentDocument?.title, isStreaming, documentTitle]);

  // Load initial prompt from document metadata
  useEffect(() => {
    const prompt = currentDocument?.metadata?.prompt as string | undefined;
    if (chatHistory.length === 0 && prompt) {
      setChatHistory([{ role: "user", content: prompt }]);
    }
  }, [currentDocument?.metadata?.prompt, chatHistory.length]);

  const handleChatSubmit = useCallback(
    async (userMessage: string) => {
      if (!currentDocument?.id) {
        return;
      }

      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
      ]);
      setError("");

      try {
        await dispatch(
          chatWithDocument({ id: currentDocument.id, message: userMessage })
        ).unwrap();
      } catch (err) {
        console.error("Chat error:", err);
        setError("Erro ao enviar mensagem. Tente novamente.");
      }
    },
    [currentDocument?.id, dispatch]
  );

  // Show streaming state when generating content
  // Check both local isStreaming state AND streamInfo to avoid race conditions
  const hasActiveStream =
    streamInfo?.id === documentId && streamInfo?.status === "generating";
  const isGenerating = isStreaming || hasActiveStream;

  // Loading states - but allow streaming even if document not fully loaded
  if (isLoading && !isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#6753FF]" />
          <span className="text-lg text-[#6C6F80]">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!currentDocument?.id && !isGenerating) {
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
          title={documentTitle || currentDocument?.title || ""}
          defaultTitle={defaultTitle}
          onSave={handleTitleSave}
          isSaving={isSaving}
          isStreaming={isGenerating && !!documentTitle}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 relative">
          <Card className="p-4 md:p-6 w-full min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#0B0D17]">Editor</h2>
              {isGenerating && (
                <div className="flex items-center space-x-2 text-[#6753FF]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">A gerar conteúdo...</span>
                </div>
              )}
            </div>
            {isGenerating ? (
              <div className="border border-[#C7C9D9] rounded-xl bg-white min-h-[600px] p-4 overflow-auto">
                {displayContent ? (
                  <StreamingText
                    text={displayContent}
                    isStreaming={isGenerating}
                    as="div"
                    className="prose prose-sm max-w-none whitespace-pre-wrap text-[#2E2F38] leading-relaxed"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[550px]">
                    <Loader2 className="w-12 h-12 animate-spin text-[#6753FF] mb-4" />
                    <p className="text-lg font-medium text-[#0B0D17]">A gerar o documento...</p>
                    <p className="text-sm text-[#6C6F80] mt-2">Isto pode demorar alguns segundos</p>
                  </div>
                )}
              </div>
            ) : (
              <RichTextEditor
                key={editorKey}
                content={content}
                onChange={handleContentChange}
                className="min-h-[600px] max-w-full"
              />
            )}
          </Card>
        </div>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel
        onChatSubmit={handleChatSubmit}
        chatHistory={chatHistory}
        isStreaming={isStreaming || isChatting}
        error={error}
        placeholder={chatPlaceholder}
        title={chatTitle}
      />
    </>
  );
}
