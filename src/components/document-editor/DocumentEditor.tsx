"use client";

import { useDocumentManager } from "@/hooks/useDocumentManager";
import { streamDocumentContent } from "@/services/api/document.service";
import { Routes } from "@/shared/types";
import {
  chatWithDocument,
  clearLastChatAnswer,
  clearStreamInfo,
  fetchDocument,
} from "@/store/documents/documentSlice";
import {
  selectEditorState,
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import RichTextEditor from "../ui/rich-text-editor";
import { StreamingText } from "../ui/streaming-text";
import AIChatPanel from "./AIChatPanel";
import DocumentTitle from "./DocumentTitle";
import DownloadButton from "./DownloadButton";

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
  const { getToken } = useAuth();
  const { currentDocument, isLoading, streamInfo, isChatting, lastChatAnswer, lastDiffChanges } =
    useAppSelector(selectEditorState);
  const {
    content,
    setContent,
    handleContentChange,
    handleTitleSave,
    handleAutosave,
    isSaving,
    editorKey,
  } = useDocumentManager(documentId);

  // Track the last updatedAt we've already shown a diff for to avoid loops
  const lastReviewedUpdateRef = useRef<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [displayContent, setDisplayContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [diffMode, setDiffMode] = useState<{
    oldText: string;
    newText: string;
    oldMarkdown: string;
    newMarkdown: string;
    diffChanges?: import("@/shared/types/api").DiffChange[];
  } | null>(null);
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
      // Set a placeholder immediately to prevent double execution
      const abortController = new AbortController();
      eventSourceRef.current = () => abortController.abort();

      setIsStreaming(true);
      rawStreamRef.current = "";
      accumulatedTitleRef.current = "";
      setDisplayContent("");
      setDocumentTitle("");

      // Get auth token and start streaming
      const startStream = async () => {
        const token = await getToken();
        if (!token) {
          eventSourceRef.current = null;
          
          // Preserve the streamed title before clearing streaming state
          const finalStreamedTitle = accumulatedTitleRef.current;
          if (finalStreamedTitle) {
            setDocumentTitle(finalStreamedTitle);
          }
          
          setIsStreaming(false);
          setError("Erro de autenticação");
          dispatch(clearStreamInfo());
          return;
        }

        // Check if aborted before starting
        if (abortController.signal.aborted) {
          return;
        }

        streamDocumentContent(
          streamInfo.streamUrl,
          {
            onContent: (chunk) => {
              rawStreamRef.current += chunk;
              const extracted = extractGeneratedContent(rawStreamRef.current);
              if (extracted) {
                setDisplayContent(extracted);
              }
            },
            onTitle: (titleChunk) => {
              accumulatedTitleRef.current += titleChunk;
              setDocumentTitle(accumulatedTitleRef.current);
            },
            onComplete: (docId, response) => {
              eventSourceRef.current = null;

              const finalStreamedTitle = accumulatedTitleRef.current;
              if (finalStreamedTitle) {
                setDocumentTitle(finalStreamedTitle);
              }

              setIsStreaming(false);

              const chatAnswer = response.chatAnswer;
              if (chatAnswer) {
                setChatHistory((prev) => [
                  ...prev,
                  { role: "assistant" as const, content: chatAnswer },
                ]);
              }

              const generatedContent = response.generatedContent;
              if (generatedContent) {
                // Enable diff mode to show changes
                // eslint-disable-next-line no-console
                console.log("[DIFF DEBUG] Setting diff mode:", {
                  oldText: content.substring(0, 100),
                  newText: generatedContent.substring(0, 100),
                  oldLength: content.length,
                  newLength: generatedContent.length
                });
                setDiffMode({
                  oldText: content,
                  newText: generatedContent,
                  oldMarkdown: content,
                  newMarkdown: generatedContent,
                  diffChanges: response.diffChanges,
                });
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
          },
          token
        )
          .then((cleanup) => {
            eventSourceRef.current = cleanup;
          })
          .catch((err) => {
            console.error("Failed to start streaming:", err);
            eventSourceRef.current = null;
            setIsStreaming(false);
            setError("Erro ao iniciar streaming");
            dispatch(clearStreamInfo());
          });
      };

      startStream();
    }
  }, [streamInfo, documentId, dispatch, setContent, getToken]);

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
      // Normalize both strings to avoid minor whitespace/line-ending mismatch loops
      const normalize = (s: string) => s.trim().replace(/\r\n/g, "\n");
      const normalizedStore = normalize(currentDocument.content);
      const normalizedLocal = normalize(content);

      // If we are already in diff mode for THIS exact content, don't re-trigger
      if (diffMode && diffMode.newMarkdown === currentDocument.content) {
        return;
      }

      // Check if content actually changed and if we haven't already reviewed this update
      const isNewUpdate = currentDocument.updatedAt !== lastReviewedUpdateRef.current;
      
      if (content && normalizedStore !== normalizedLocal && isNewUpdate) {
        // Content changed from AI chat - trigger diff mode
        // eslint-disable-next-line no-console
        console.log("[DIFF DEBUG] Content changed from chat:", {
          oldLength: content.length,
          newLength: currentDocument.content.length,
          updatedAt: currentDocument.updatedAt
        });

        setDiffMode({
          oldText: content,
          newText: currentDocument.content,
          oldMarkdown: content,
          newMarkdown: currentDocument.content,
          diffChanges: lastDiffChanges || undefined,
        });
      } else if (!content || (normalizedStore === normalizedLocal && isNewUpdate)) {
        // Initial load OR content already matches but it's a new timestamp
        if (isNewUpdate) {
          lastReviewedUpdateRef.current = currentDocument.updatedAt;
        }
        setContent(currentDocument.content);
      }
    }
  }, [currentDocument?.content, currentDocument?.id, currentDocument?.updatedAt, isStreaming, diffMode, setContent, content, lastDiffChanges]);

  // Handle accepting a diff change
  const handleAcceptChange = useCallback(
    (changeId: string | number) => {
      // eslint-disable-next-line no-console
      console.log("[DOC EDITOR] Accept callback called for id:", changeId);
      if (!diffMode) return;
      
      if (diffMode.diffChanges) {
        // Filter out the accepted change
        const remainingChanges = diffMode.diffChanges.filter(c => c.id !== String(changeId));
        
        if (remainingChanges.length === 0) {
          // Final decision: ACCEPT ALL
          // Mark this document update as reviewed
          lastReviewedUpdateRef.current = currentDocument?.updatedAt || null;
          
          // Ensure both local state and server are updated
          const finalContent = diffMode.newMarkdown;
          setContent(finalContent);
          handleAutosave(finalContent);
          
          // Close diff mode
          setDiffMode(null);
        } else {
          // Mark current change as reviewed and hide it
          setDiffMode({
            ...diffMode,
            diffChanges: remainingChanges
          });
        }
      } else {
        // Fallback for when no diffChanges are provided
        lastReviewedUpdateRef.current = currentDocument?.updatedAt || null;
        setContent(diffMode.newMarkdown);
        handleAutosave(diffMode.newMarkdown);
        setDiffMode(null);
      }
    },
    [diffMode, setContent, handleAutosave, currentDocument?.updatedAt]
  );

  // Handle rejecting a diff change
  const handleRejectChange = useCallback(
    (changeId: string | number) => {
      // eslint-disable-next-line no-console
      console.log("[DOC EDITOR] Reject callback called for id:", changeId);
      if (!diffMode) return;
      
      if (diffMode.diffChanges) {
        const remainingChanges = diffMode.diffChanges.filter(c => c.id !== String(changeId));
        
        if (remainingChanges.length === 0) {
          // Final decision: REJECT ALL
          // Mark this update as reviewed
          lastReviewedUpdateRef.current = currentDocument?.updatedAt || null;
          
          // RESTORE the old content locally and on the server
          const restoredContent = diffMode.oldMarkdown;
          setContent(restoredContent);
          handleAutosave(restoredContent);
          
          // Close diff mode
          setDiffMode(null);
        } else {
          // Mark as reviewed (hides the buttons for this segment)
          setDiffMode({
            ...diffMode,
            diffChanges: remainingChanges
          });
        }
      } else {
        // Full rejection fallback
        lastReviewedUpdateRef.current = currentDocument?.updatedAt || null;
        setContent(diffMode.oldMarkdown);
        handleAutosave(diffMode.oldMarkdown);
        setDiffMode(null);
      }
    },
    [diffMode, setContent, handleAutosave, currentDocument?.updatedAt]
  );

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
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!currentDocument?.id && !isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">
            Documento não encontrado
          </p>
          <button
            onClick={() => router.push(Routes.DOCUMENTS)}
            className="text-primary hover:underline"
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
      <div className="flex-1 flex flex-col w-full">
        <DocumentTitle
          title={documentTitle || currentDocument?.title || ""}
          defaultTitle={defaultTitle}
          onSave={handleTitleSave}
          isSaving={isSaving}
          isStreaming={isGenerating && !!documentTitle}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 relative">
          <div className="flex flex-col min-w-0">
            {isGenerating ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Editor</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">A gerar conteúdo...</span>
                    </div>
                    <DownloadButton
                      title={documentTitle || currentDocument?.title || defaultTitle}
                      content={content}
                      disabled={isGenerating || !content}
                    />
                  </div>
                </div>
                <div className="border border-border rounded-xl bg-card min-h-[600px] w-full p-4 overflow-auto">
                  {displayContent ? (
                    <StreamingText
                      text={displayContent}
                      isStreaming={isGenerating}
                      as="div"
                      className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground leading-relaxed"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full min-h-[550px]">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium text-foreground">A gerar o documento...</p>
                      <p className="text-sm text-muted-foreground mt-2">Isto pode demorar alguns segundos</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <RichTextEditor
                key={`${editorKey}-${diffMode ? "diff" : "normal"}`}
                content={diffMode ? diffMode.newMarkdown : content}
                onChange={handleContentChange}
                onAutosave={handleAutosave}
                className="min-h-[600px] max-w-full"
                diffMode={
                  diffMode
                    ? {
                        oldText: diffMode.oldText,
                        newText: diffMode.newText,
                        diffChanges: diffMode.diffChanges,
                        onAccept: handleAcceptChange,
                        onReject: handleRejectChange,
                      }
                    : undefined
                }
                rightHeaderContent={
                  <div className="flex items-center gap-3 pr-1">
                    {diffMode && (
                      <span className="text-sm font-medium text-muted-foreground">
                        Revendo alterações AI
                      </span>
                    )}
                    {isGenerating && (
                      <div className="flex items-center space-x-2 text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium hidden sm:inline">A gerar...</span>
                      </div>
                    )}
                    <DownloadButton
                      title={documentTitle || currentDocument?.title || defaultTitle}
                      content={content}
                      disabled={isGenerating || !content}
                    />
                  </div>
                }
              />
            )}
          </div>

          {/* AI Chat Sidebar */}
          <div className="hidden lg:block sticky top-[5px] self-start">
            <AIChatPanel
              onChatSubmit={handleChatSubmit}
              chatHistory={chatHistory}
              isStreaming={isStreaming || isChatting}
              error={error}
              placeholder={chatPlaceholder}
              title={chatTitle}
              sources={(currentDocument?.metadata?.sources as string[]) || []}
            />
          </div>
        </div>
      </div>

      {/* Mobile AI Chat */}
      <div className="lg:hidden">
        <AIChatPanel
          onChatSubmit={handleChatSubmit}
          chatHistory={chatHistory}
          isStreaming={isStreaming || isChatting}
          error={error}
          placeholder={chatPlaceholder}
          title={chatTitle}
          sources={(currentDocument?.metadata?.sources as string[]) || []}
        />
      </div>
    </>
  );
}
