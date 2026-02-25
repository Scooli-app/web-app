"use client";

import { useDocumentManager } from "@/hooks/useDocumentManager";
import { streamDocumentContent } from "@/services/api/document.service";
import { AUTO_SAVE_DELAY } from "@/shared/config/constants";
import { Routes } from "@/shared/types";
import type { RagSource } from "@/shared/types/document";
import { htmlToMarkdown, markdownToHtml } from "@/shared/utils/markdown";
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
import { fetchUsage } from "@/store/subscription/subscriptionSlice";
import { useAuth } from "@clerk/nextjs";
import type { Editor } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiffToolbar } from "../editor/DiffToolbar";
import { computeDiff, markdownToNode } from "../editor/utils/diffEngine";
import RichTextEditor from "../ui/rich-text-editor";
import { StreamingText } from "../ui/streaming-text";
import AIChatPanel from "./AIChatPanel";
import DocumentTitle from "./DocumentTitle";
import DownloadButton from "./DownloadButton";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  hasUpdate?: boolean;
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
  const { currentDocument, isLoading, streamInfo, isChatting, lastChatAnswer } =
    useAppSelector(selectEditorState);
  const {
    content,
    setContent,
    handleContentChange,
    handleTitleSave,
    handleAutosave,
    isSaving,
    editorKey,
    skipNextEditorKeyBumpRef,
  } = useDocumentManager(documentId);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [displayContent, setDisplayContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [sources, setSources] = useState<RagSource[]>([]);
  
  const eventSourceRef = useRef<(() => void) | null>(null);
  const rawStreamRef = useRef("");
  const accumulatedTitleRef = useRef("");
  const editorRef = useRef<Editor | null>(null);
  const isChatInProgressRef = useRef(false);


  // Diff / Suggestions mode state
  const [isSuggestionsMode, setIsSuggestionsMode] = useState(false);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

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
        const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
        const token = await getToken(template ? { template } : undefined);
        if (!token) {
          eventSourceRef.current = null;
          
          const finalStreamedTitle = accumulatedTitleRef.current;
          if (finalStreamedTitle) {
            setDocumentTitle(finalStreamedTitle);
          }
          
          setIsStreaming(false);
          setError("Erro de autenticação");
          dispatch(clearStreamInfo());
          return;
        }

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
            onSources: (newSources) => {
              setSources(newSources);
            },
            onComplete: (docId, response) => {
              eventSourceRef.current = null;

              const finalStreamedTitle = accumulatedTitleRef.current;
              if (finalStreamedTitle) {
                setDocumentTitle(finalStreamedTitle);
              }

              setIsStreaming(false);

              const chatAnswer = response.chatAnswer;
              const generatedContent = response.generatedContent;
              
              // Update sources if returned in response
              if (response.sources && response.sources.length > 0) {
                setSources(response.sources);
              }
              
              if (chatAnswer) {
                setChatHistory((prev) => [
                  ...prev,
                  { 
                    role: "assistant" as const, 
                    content: chatAnswer,
                    hasUpdate: !!generatedContent 
                  },
                ]);
              }

              if (generatedContent && editorRef.current) {
                // Enter suggestions mode with diff
                try {
                  const editor = editorRef.current;
                  const baseDoc = editor.state.doc;
                  const aiNode = markdownToNode(generatedContent, editor.schema);

                  // Compute diff between current and AI-generated content
                  const diffChanges = computeDiff(baseDoc, aiNode);

                  if (diffChanges.length > 0) {
                    // Store original content for "Reject All"
                    const storage = (editor.storage as unknown as Record<string, { originalContent?: string | null }>).diff;
                    if (storage) {
                      storage.originalContent = editor.getHTML();
                    }

                    // Replace editor content with AI content
                    const aiHtml = markdownToHtml(generatedContent);
                    editor.commands.setContent(aiHtml, { emitUpdate: false });

                    // Apply diff decorations
                    editor.commands.setDiffChanges(diffChanges);
                    setIsSuggestionsMode(true);
                  } else {
                    // No differences — just update content directly
                    setContent(generatedContent);
                    handleAutosave(generatedContent);
                    setShowUpdateIndicator(true);
                    setTimeout(() => setShowUpdateIndicator(false), AUTO_SAVE_DELAY);
                  }
                } catch (err) {
                  console.error("Error computing diff:", err);
                  // Fallback: direct update without diff
                  setContent(generatedContent);
                  handleAutosave(generatedContent);
                  setShowUpdateIndicator(true);
                  setTimeout(() => setShowUpdateIndicator(false), AUTO_SAVE_DELAY);
                }
              } else if (generatedContent) {
                // No editor ref available, direct update
                setContent(generatedContent);
                handleAutosave(generatedContent);
                setShowUpdateIndicator(true);
                setTimeout(() => setShowUpdateIndicator(false), AUTO_SAVE_DELAY);
              }

              dispatch(clearStreamInfo());
              dispatch(fetchDocument(docId));
              dispatch(fetchUsage());
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
  }, [streamInfo, documentId, dispatch, setContent, getToken, handleAutosave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Register callback to auto-exit suggestions mode when all changes are resolved
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const storage = (editor.storage as unknown as Record<string, { onDiffStateChange?: ((active: boolean, count: number) => void) | null }>).diff;
    if (!storage) return;

    storage.onDiffStateChange = (active: boolean, count: number) => {
      if (!active && count === 0 && isSuggestionsMode) {
        // All changes have been individually accepted/rejected
        setIsSuggestionsMode(false);
        // Sync the final editor content back to state
        const html = editor.getHTML();
        const markdown = htmlToMarkdown(html);
        setContent(markdown);
        handleAutosave(markdown);
      }
    };

    return () => {
      storage.onDiffStateChange = null;
    };
  }, [isSuggestionsMode, setContent, handleAutosave]);


  // Handle chat answer from Redux (for non-chat paths or fallback)
  useEffect(() => {
    if (lastChatAnswer) {
      // Chat answer is now handled in handleChatSubmit directly,
      // but clear it from Redux to prevent stale state
      dispatch(clearLastChatAnswer());
    }
  }, [lastChatAnswer, dispatch]);

  // Sync content when currentDocument changes
  // Skip sync during suggestions mode OR if a chat submission is in progress
  useEffect(() => {
    if (!currentDocument?.content || isStreaming || isSuggestionsMode || isChatInProgressRef.current) return;
    setContent(currentDocument.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Sync sources from currentDocument when document loads
  useEffect(() => {
    if (currentDocument?.sources && currentDocument.sources.length > 0 && !isStreaming) {
      setSources(currentDocument.sources);
    }
  }, [currentDocument?.sources, isStreaming]);

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

      const editor = editorRef.current;
      const baseDocBefore = editor ? editor.state.doc : null;
      const originalHtmlBefore = editor ? editor.getHTML() : null;

      // Prevent content sync during the request
      isChatInProgressRef.current = true;
      skipNextEditorKeyBumpRef.current = true;

      try {
        const response = await dispatch(
          chatWithDocument({ id: currentDocument.id, message: userMessage })
        ).unwrap();

        // Add chat answer to history
        if (response.chatAnswer) {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant" as const, content: response.chatAnswer, hasUpdate: !!response.content },
          ]);
        }

        // Handle content update with diff mode
        if (response.content && editor) {
          try {
            const aiContent = response.content.trim();
            const aiNode = markdownToNode(aiContent, editor.schema);
            // Use baseDocBefore to ensure we compare with the document BEFORE the API updated Redux
            const diffChanges = computeDiff(baseDocBefore || editor.state.doc, aiNode);

            if (diffChanges.length > 0) {
              // Store original content for "Reject All"
              const storage = (editor.storage as unknown as Record<string, { originalContent?: string | null }>).diff;
              if (storage) {
                storage.originalContent = originalHtmlBefore || editor.getHTML();
              }

              // Replace editor content with AI content
              const aiHtml = markdownToHtml(aiContent);
              editor.commands.setContent(aiHtml, { emitUpdate: false });

              // Apply diff decorations
              editor.commands.setDiffChanges(diffChanges);
              setIsSuggestionsMode(true);
            } else {
              // No differences — just sync normally
              setContent(aiContent);
            }
          } catch (err) {
            console.error("Error computing diff:", err);
            setContent(response.content);
          }
        } else if (response.content) {
          // No editor ref — direct update
          setContent(response.content);
        }

        // Update sources if available
        if (response.sources && response.sources.length > 0) {
          setSources(response.sources);
        }
      } catch {
        setError("Erro ao processar sua mensagem. Tente novamente mais tarde.");
      } finally {
        isChatInProgressRef.current = false;
        skipNextEditorKeyBumpRef.current = false;
      }
    },
    [currentDocument?.id, dispatch, skipNextEditorKeyBumpRef, setContent]
  );

  const isGenerating = isStreaming || (streamInfo?.id === documentId && streamInfo?.status === "generating");

  // Handle exiting diff / suggestions mode
  const handleExitDiffMode = useCallback(() => {
    setIsSuggestionsMode(false);
    if (editorRef.current) {
      // Sync current editor content back to state
      const html = editorRef.current.getHTML();
      const markdown = htmlToMarkdown(html);
      setContent(markdown);
      handleAutosave(markdown);
    }
  }, [setContent, handleAutosave]);

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
          <p className="text-lg text-muted-foreground mb-4">Documento não encontrado</p>
          <button onClick={() => router.push(Routes.DOCUMENTS)} className="text-primary hover:underline">
            Voltar aos documentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
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
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {isSuggestionsMode && editorRef.current && (
                  <DiffToolbar
                    editor={editorRef.current}
                    onExitDiffMode={handleExitDiffMode}
                  />
                )}
                <RichTextEditor
                  key={editorKey}
                  content={content}
                  onChange={handleContentChange}
                  onAutosave={handleAutosave}
                  className="min-h-[600px] max-w-full"
                  onEditorReady={handleEditorReady}
                  rightHeaderContent={
                    <div className="flex items-center gap-3 pr-1">
                      {showUpdateIndicator && (
                        <span className="text-sm font-medium text-primary animate-pulse flex items-center gap-1">
                          ✨ Documento Refinado
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
              </>
            )}
          </div>

          <div className="hidden lg:block sticky top-[5px] self-start">
            <AIChatPanel
              onChatSubmit={handleChatSubmit}
              chatHistory={chatHistory}
              isStreaming={isStreaming || isChatting}
              error={error}
              placeholder={chatPlaceholder}
              title={chatTitle}
              sources={sources}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <AIChatPanel
          onChatSubmit={handleChatSubmit}
          chatHistory={chatHistory}
          isStreaming={isStreaming || isChatting}
          error={error}
          placeholder={chatPlaceholder}
          title={chatTitle}
          sources={sources}
        />
      </div>
    </>
  );
}
