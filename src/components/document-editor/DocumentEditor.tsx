"use client";

import { useDocumentManager } from "@/hooks/useDocumentManager";
import { uploadDocumentImage } from "@/services/api/document-images.service";
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
  fetchDocumentImages,
  setGeneratingImages,
  setImageError,
  setImages,
  upsertImage,
} from "@/store/documents/documentSlice";
import {
  selectEditorState,
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";
import {
  selectIsPro,
  selectSubscriptionLoading,
} from "@/store/subscription/selectors";
import {
  fetchSubscription,
  fetchUsage,
} from "@/store/subscription/subscriptionSlice";
import { useAuth } from "@clerk/nextjs";
import type { Editor } from "@tiptap/react";
import { Crown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DiffToolbar } from "../editor/DiffToolbar";
import { computeDiff, markdownToNode } from "../editor/utils/diffEngine";
import RichTextEditor from "../ui/rich-text-editor";
import { StreamingText } from "../ui/streaming-text";
import AIChatPanel from "./AIChatPanel";
import DocumentTitle from "./DocumentTitle";
import DownloadButton from "./DownloadButton";
import ShareButton from "./ShareButton";

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

const LEAKED_IMAGE_SEGMENT_TOKEN_PATTERN = /@@CODEX\\?_IMAGE\\?_SEGMENT\\?_\d+@@|CODEXIMAGESEGMENT\d+TOKEN/g;
const STABLE_DOCUMENT_IMAGE_TOKEN_PATTERN = /\{\{DOCUMENT_IMAGE:([0-9a-fA-F-]+)\}\}/g;

function containsLeakedImageSegmentTokens(content: string): boolean {
  return /@@CODEX\\?_IMAGE\\?_SEGMENT\\?_\d+@@|CODEXIMAGESEGMENT\d+TOKEN/i.test(content);
}

function repairLeakedImageSegmentTokens(
  content: string,
  images: Array<{ id: string; alt: string }>,
): string {
  if (!content || !images.length || !containsLeakedImageSegmentTokens(content)) {
    return content;
  }

  const alreadyReferencedImageIds = new Set<string>();
  for (const match of content.matchAll(STABLE_DOCUMENT_IMAGE_TOKEN_PATTERN)) {
    if (match[1]) {
      alreadyReferencedImageIds.add(match[1]);
    }
  }

  const availableImages = images.filter(
    (image) => image?.id && !alreadyReferencedImageIds.has(image.id),
  );

  if (availableImages.length === 0) {
    return content.replace(LEAKED_IMAGE_SEGMENT_TOKEN_PATTERN, "");
  }

  let replacementIndex = 0;
  return content.replace(LEAKED_IMAGE_SEGMENT_TOKEN_PATTERN, () => {
    const image = availableImages[replacementIndex];
    replacementIndex += 1;
    if (!image) {
      return "";
    }
    const safeAlt = (image.alt || "Imagem").replace(/\]/g, "\\]");
    return `![${safeAlt}]({{DOCUMENT_IMAGE:${image.id}}})`;
  });
}

export default function DocumentEditor({
  documentId,
  defaultTitle = "Novo Documento",
  loadingMessage = "A carregar documento...",
  chatTitle = "Assistente de IA",
  chatPlaceholder = "Faça uma pergunta ou peça ajuda...",
}: DocumentEditorProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const {
    currentDocument,
    isLoading,
    streamInfo,
    isChatting,
    lastChatAnswer,
    images,
    imageError,
  } = useAppSelector(selectEditorState);
  const isPremium = useAppSelector(selectIsPro);
  const isSubscriptionLoading = useAppSelector(selectSubscriptionLoading);
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
  const [isImageUploading, setIsImageUploading] = useState(false);

  const eventSourceRef = useRef<(() => void) | null>(null);
  const rawStreamRef = useRef("");
  const latestDisplayContentRef = useRef("");
  const accumulatedTitleRef = useRef("");
  const editorRef = useRef<Editor | null>(null);
  const isChatInProgressRef = useRef(false);
  const pendingVisualCountRef = useRef(0);
  const completedVisualCountRef = useRef(0);
  const hasAttemptedLeakedTokenRepairRef = useRef(false);
  const completionFallbackTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Diff / Suggestions mode state
  const [isSuggestionsMode, setIsSuggestionsMode] = useState(false);

  // Reset document-scoped UI state when switching document IDs.
  // This prevents chat/source leakage between documents during route transitions.
  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setChatHistory([]);
    setSources([]);
    setError("");
    setDisplayContent("");
    setDocumentTitle("");
    setShowUpdateIndicator(false);
    setIsSuggestionsMode(false);
    hasAttemptedLeakedTokenRepairRef.current = false;
    rawStreamRef.current = "";
    latestDisplayContentRef.current = "";
    accumulatedTitleRef.current = "";
  }, [documentId]);

  // Check for imported query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("imported") === "true") {
        import("sonner").then(({ toast }) => {
          toast.success(
            "Documento importado com sucesso. Pode agora editar ou melhorar com IA.",
            {
              duration: 8000,
            },
          );
        });
        // Remove the query param to avoid repeating on refresh
        router.replace(window.location.pathname, { scroll: false });
      }
    }
  }, [router]);

  useEffect(() => {
    dispatch(fetchSubscription());
  }, [dispatch]);

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

  const normalizePendingTitle = useCallback((rawTitle: string): string => {
    const trimmed = rawTitle?.trim() ?? "";
    if (!trimmed) {
      return "";
    }
    if (/^generating\.{0,3}$/i.test(trimmed)) {
      return "A gerar...";
    }
    return trimmed;
  }, []);

  const clearCompletionFallback = () => {
    if (completionFallbackTimeoutRef.current) {
      clearTimeout(completionFallbackTimeoutRef.current);
      completionFallbackTimeoutRef.current = null;
    }
  };

  const escapeHtmlAttribute = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const handleToolbarImageUpload = useCallback(
    async (file: File) => {
      if (!currentDocument?.id || currentDocument.id !== documentId) {
        toast.error("Documento indisponível para upload de imagem.");
        return;
      }

      const currentlyGenerating =
        isStreaming ||
        (streamInfo?.id === documentId && streamInfo?.status === "generating");

      if (currentlyGenerating || isImageUploading) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um ficheiro de imagem válido.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("A imagem excede o limite de 10MB.");
        return;
      }

      setIsImageUploading(true);
      try {
        const result = await uploadDocumentImage(currentDocument.id, file);
        dispatch(upsertImage(result.image));

        const stableToken = result.markdown.match(/\{\{DOCUMENT_IMAGE:[^}]+\}\}/)?.[0]
          ?? `{{DOCUMENT_IMAGE:${result.image.id}}}`;
        const altText = escapeHtmlAttribute(result.image.alt || file.name);

        if (editorRef.current) {
          editorRef.current
            .chain()
            .focus()
            .insertContent(`<img src="${stableToken}" alt="${altText}" />`)
            .run();
        } else {
          const fallbackMarkdown = result.markdown || `![${result.image.alt || "Imagem"}](${stableToken})`;
          const nextContent = content ? `${content}\n\n${fallbackMarkdown}` : fallbackMarkdown;
          setContent(nextContent);
          handleAutosave(nextContent);
        }

        dispatch(fetchDocumentImages(currentDocument.id));
        toast.success("Imagem adicionada ao documento.");
      } catch (error: unknown) {
        const apiMessage =
          typeof error === "object" && error !== null
            ? (
                (error as { response?: { data?: { error?: string; message?: string } } })
                  .response?.data?.error ||
                (error as { response?: { data?: { error?: string; message?: string } } })
                  .response?.data?.message
              )
            : null;
        const fallbackMessage = error instanceof Error ? error.message : "Não foi possível carregar a imagem.";
        toast.error(apiMessage || fallbackMessage);
      } finally {
        setIsImageUploading(false);
      }
    },
    [
      content,
      currentDocument?.id,
      dispatch,
      documentId,
      handleAutosave,
      isStreaming,
      isImageUploading,
      streamInfo?.id,
      streamInfo?.status,
      setContent,
    ]
  );

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
      latestDisplayContentRef.current = "";
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
            setDocumentTitle(normalizePendingTitle(finalStreamedTitle));
          }

          setIsStreaming(false);
          setError("Erro de autenticação");
          dispatch(clearStreamInfo());
          return;
        }

        if (abortController.signal.aborted) {
          return;
        }

        const finalizeStreamWithoutDone = () => {
          clearCompletionFallback();
          if (eventSourceRef.current) {
            eventSourceRef.current();
            eventSourceRef.current = null;
          }
          setIsStreaming(false);
          pendingVisualCountRef.current = 0;
          completedVisualCountRef.current = 0;
          dispatch(clearStreamInfo());
          dispatch(setGeneratingImages(false));

          const fallbackContent =
            latestDisplayContentRef.current ||
            extractGeneratedContent(rawStreamRef.current);
          if (fallbackContent) {
            setContent(fallbackContent);
          }

          void dispatch(fetchDocument(documentId));
          void dispatch(fetchDocumentImages(documentId));
        };

        streamDocumentContent(
          streamInfo.streamUrl,
          {
            onContent: (chunk) => {
              rawStreamRef.current += chunk;
              const extracted = extractGeneratedContent(rawStreamRef.current);
              if (extracted) {
                latestDisplayContentRef.current = extracted;
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
            onVisualsGenerating: (count) => {
              clearCompletionFallback();
              pendingVisualCountRef.current = count ?? 0;
              completedVisualCountRef.current = 0;
              dispatch(setGeneratingImages((count ?? 0) > 0));
              dispatch(setImageError(null));
            },
            onImageReady: (image) => {
              completedVisualCountRef.current += 1;
              dispatch(upsertImage(image));
              if (
                pendingVisualCountRef.current > 0 &&
                completedVisualCountRef.current >= pendingVisualCountRef.current
              ) {
                dispatch(setGeneratingImages(false));
                clearCompletionFallback();
                completionFallbackTimeoutRef.current = setTimeout(() => {
                  finalizeStreamWithoutDone();
                  dispatch(
                    setImageError(
                      "A geração de imagens terminou com falhas ou atrasos no stream.",
                    ),
                  );
                }, 3000);
              }
            },
            onImageFailed: (image, imageErrorMessage) => {
              completedVisualCountRef.current += 1;
              if (image) {
                dispatch(upsertImage(image));
              }
              if (imageErrorMessage) {
                dispatch(setImageError(imageErrorMessage));
              }
              if (
                pendingVisualCountRef.current > 0 &&
                completedVisualCountRef.current >= pendingVisualCountRef.current
              ) {
                dispatch(setGeneratingImages(false));
                clearCompletionFallback();
                completionFallbackTimeoutRef.current = setTimeout(() => {
                  finalizeStreamWithoutDone();
                  dispatch(
                    setImageError(
                      "A geração de imagens terminou com falhas ou atrasos no stream.",
                    ),
                  );
                }, 3000);
              }
            },
            onComplete: (docId, response) => {
              clearCompletionFallback();
              eventSourceRef.current = null;
              const expectedVisualCount = pendingVisualCountRef.current;

              const finalStreamedTitle = accumulatedTitleRef.current;
              if (finalStreamedTitle) {
                setDocumentTitle(normalizePendingTitle(finalStreamedTitle));
              } else if (response.title) {
                setDocumentTitle(normalizePendingTitle(response.title));
              }

              setIsStreaming(false);
              pendingVisualCountRef.current = 0;
              completedVisualCountRef.current = 0;

              const chatAnswer = response.chatAnswer;
              const finalContent = response.content;

              if (finalContent) {
                setContent(finalContent);
              }

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
                    hasUpdate: !!finalContent,
                  },
                ]);
              }

              if (finalContent && editorRef.current) {
                // Enter suggestions mode with diff
                try {
                  const editor = editorRef.current;
                  const baseDoc = editor.state.doc;
                  const aiNode = markdownToNode(finalContent, editor.schema);

                  // Compute diff between current and AI-generated content
                  const diffChanges = computeDiff(baseDoc, aiNode);

                  if (diffChanges.length > 0) {
                    // Store original content for "Reject All"
                    const storage = (
                      editor.storage as unknown as Record<
                        string,
                        { originalContent?: string | null }
                      >
                    ).diff;
                    if (storage) {
                      storage.originalContent = editor.getHTML();
                    }

                    // Replace editor content with AI content
                    const aiHtml = markdownToHtml(finalContent);
                    editor.commands.setContent(aiHtml, { emitUpdate: false });

                    // Apply diff decorations
                    editor.commands.setDiffChanges(diffChanges);
                    setIsSuggestionsMode(true);
                  } else {
                    // No differences — just update content directly
                    setContent(finalContent);
                    setShowUpdateIndicator(true);
                    setTimeout(
                      () => setShowUpdateIndicator(false),
                      AUTO_SAVE_DELAY,
                    );
                  }
                } catch (err) {
                  console.error("Error computing diff:", err);
                  // Fallback: direct update without diff
                  setContent(finalContent);
                  setShowUpdateIndicator(true);
                  setTimeout(
                    () => setShowUpdateIndicator(false),
                    AUTO_SAVE_DELAY,
                  );
                }
              } else if (finalContent) {
                // No editor ref available, direct update
                setContent(finalContent);
                setShowUpdateIndicator(true);
                setTimeout(
                  () => setShowUpdateIndicator(false),
                  AUTO_SAVE_DELAY,
                );
              }

              dispatch(clearStreamInfo());
              if (docId === documentId) {
                dispatch(fetchDocument(docId));
                dispatch(fetchDocumentImages(docId));
              }
              dispatch(setGeneratingImages(false));
              dispatch(fetchUsage());

              if (expectedVisualCount > 0) {
                const pollImages = async (attempt: number) => {
                  try {
                    const latestImages = await dispatch(
                      fetchDocumentImages(docId),
                    ).unwrap();
                    const settledCount = latestImages.filter(
                      (image) =>
                        image.status === "completed" ||
                        image.status === "failed",
                    ).length;

                    if (settledCount >= expectedVisualCount || attempt >= 8) {
                      return;
                    }
                  } catch {
                    if (attempt >= 8) {
                      return;
                    }
                  }

                  setTimeout(() => {
                    void pollImages(attempt + 1);
                  }, 1500);
                };

                setTimeout(() => {
                  void pollImages(1);
                }, 1200);
              }
            },
            onError: (errorMsg) => {
              clearCompletionFallback();
              eventSourceRef.current = null;
              setIsStreaming(false);
              pendingVisualCountRef.current = 0;
              completedVisualCountRef.current = 0;
              setError(errorMsg);
              dispatch(clearStreamInfo());
              dispatch(setGeneratingImages(false));
            },
          },
          token,
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
            dispatch(setGeneratingImages(false));
          });
      };

      startStream();
    }
  }, [
    streamInfo,
    documentId,
    dispatch,
    setContent,
    getToken,
    handleAutosave,
    normalizePendingTitle,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCompletionFallback();
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

    const storage = (
      editor.storage as unknown as Record<
        string,
        {
          onDiffStateChange?: ((active: boolean, count: number) => void) | null;
        }
      >
    ).diff;
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
    if (
      currentDocument?.id !== documentId ||
      !currentDocument?.content ||
      isStreaming ||
      isSuggestionsMode ||
      isChatInProgressRef.current
    )
      return;
    setContent(currentDocument.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentDocument?.id,
    documentId,
    currentDocument?.content,
    currentDocument?.updatedAt,
    isStreaming,
    setContent,
  ]);

  useEffect(() => {
    if (currentDocument?.id !== documentId) {
      return;
    }
    if (currentDocument?.title && !isStreaming) {
      const normalizedCurrentTitle = normalizePendingTitle(currentDocument.title);
      if (
        !documentTitle ||
        normalizedCurrentTitle === documentTitle ||
        normalizedCurrentTitle.length >= documentTitle.length
      ) {
        setDocumentTitle(normalizedCurrentTitle);
      }
    }
  }, [
    currentDocument?.id,
    currentDocument?.title,
    documentId,
    isStreaming,
    documentTitle,
    normalizePendingTitle,
  ]);

  // Load initial prompt from document metadata
  useEffect(() => {
    if (currentDocument?.id !== documentId) {
      return;
    }

    const rawPrompt =
      currentDocument?.metadata?.prompt ??
      currentDocument?.metadata?.initialPrompt ??
      currentDocument?.metadata?.initial_prompt;
    const prompt = typeof rawPrompt === "string" ? rawPrompt.trim() : "";

    if (chatHistory.length === 0 && prompt) {
      setChatHistory([{ role: "user", content: prompt }]);
    }
  }, [
    currentDocument?.id,
    currentDocument?.metadata.prompt,
    currentDocument?.metadata.initialPrompt,
    currentDocument?.metadata.initial_prompt,
    documentId,
    chatHistory.length,
  ]);

  // Sync sources from currentDocument when document loads
  useEffect(() => {
    if (currentDocument?.id !== documentId || isStreaming) {
      return;
    }
    setSources(currentDocument?.sources ?? []);
  }, [currentDocument?.id, currentDocument?.sources, documentId, isStreaming]);

  // Keep image state in sync with the current document.
  useEffect(() => {
    dispatch(setImages([]));
    dispatch(setImageError(null));

    if (currentDocument?.id && currentDocument.id === documentId) {
      dispatch(fetchDocumentImages(currentDocument.id));
    }
  }, [dispatch, currentDocument?.id, documentId]);

  // Recover from older leaked internal image tokens by remapping them to stable refs.
  useEffect(() => {
    if (hasAttemptedLeakedTokenRepairRef.current) {
      return;
    }
    if (!content || !images || images.length === 0) {
      return;
    }
    if (!containsLeakedImageSegmentTokens(content)) {
      hasAttemptedLeakedTokenRepairRef.current = true;
      return;
    }

    const repaired = repairLeakedImageSegmentTokens(content, images);
    hasAttemptedLeakedTokenRepairRef.current = true;

    if (repaired === content) {
      return;
    }

    setContent(repaired);
    handleAutosave(repaired);
    toast.warning("Detetámos e corrigimos referências internas de imagem no documento.");
  }, [content, images, handleAutosave, setContent]);

  const handleChatSubmit = useCallback(
    async (userMessage: string) => {
      if (!currentDocument?.id || currentDocument.id !== documentId) {
        return;
      }

      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
      ]);
      setError("");
      posthog.capture("ai_chat_message_sent", {
        document_id: currentDocument.id,
      });

      const editor = editorRef.current;
      const baseDocBefore = editor ? editor.state.doc : null;
      const originalHtmlBefore = editor ? editor.getHTML() : null;

      // Prevent content sync during the request
      isChatInProgressRef.current = true;
      skipNextEditorKeyBumpRef.current = true;

      try {
        const response = await dispatch(
          chatWithDocument({ id: currentDocument.id, message: userMessage }),
        ).unwrap();
        dispatch(fetchDocumentImages(currentDocument.id));

        // Add chat answer to history
        if (response.chatAnswer) {
          setChatHistory((prev) => [
            ...prev,
            {
              role: "assistant" as const,
              content: response.chatAnswer,
              hasUpdate: !!response.content,
            },
          ]);
        }

        // Handle content update with diff mode
        if (response.content && editor) {
          try {
            const aiContent = response.content.trim();
            const aiNode = markdownToNode(aiContent, editor.schema);
            // Use baseDocBefore to ensure we compare with the document BEFORE the API updated Redux
            const diffChanges = computeDiff(
              baseDocBefore || editor.state.doc,
              aiNode,
            );

            if (diffChanges.length > 0) {
              // Store original content for "Reject All"
              const storage = (
                editor.storage as unknown as Record<
                  string,
                  { originalContent?: string | null }
                >
              ).diff;
              if (storage) {
                storage.originalContent =
                  originalHtmlBefore || editor.getHTML();
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
    [currentDocument?.id, dispatch, documentId, skipNextEditorKeyBumpRef, setContent],
  );

  const isGenerating =
    isStreaming ||
    (streamInfo?.id === documentId && streamInfo?.status === "generating");
  const activeDocument =
    currentDocument?.id === documentId ? currentDocument : null;
  const resolvedTitle =
    documentTitle || normalizePendingTitle(activeDocument?.title || "");

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
          <span className="text-lg text-muted-foreground">
            {loadingMessage}
          </span>
        </div>
      </div>
    );
  }

  if (!activeDocument?.id && !isGenerating) {
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
      <div className="flex-1 flex flex-col w-full">
        <DocumentTitle
          title={resolvedTitle}
          defaultTitle={defaultTitle}
          onSave={handleTitleSave}
          isSaving={isSaving}
          isStreaming={isGenerating && !!documentTitle}
        />

        {imageError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {imageError}
          </div>
        )}

        <div className="relative grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col min-w-0">
            {isGenerating ? (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                    Editor
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <ShareButton
                      title={resolvedTitle || defaultTitle}
                      content={content}
                      disabled={isGenerating || !content}
                      documentId={documentId}
                      grade={activeDocument?.gradeLevel || ""}
                      subject={activeDocument?.subject || ""}
                      resourceType={activeDocument?.documentType || ""}
                      sharedStatus={activeDocument?.sharedResourceStatus}
                    />
                    <DownloadButton
                      title={resolvedTitle || defaultTitle}
                      content={content}
                      images={images}
                      isProUser={isPremium}
                      disabled={isGenerating || !content}
                    />
                  </div>
                </div>
                <div className="min-h-[50dvh] w-full overflow-auto rounded-xl border border-border bg-card p-3 sm:min-h-[600px] sm:p-4">
                  {displayContent ? (
                    <StreamingText
                      text={displayContent}
                      isStreaming={isGenerating}
                      as="div"
                      className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground leading-relaxed"
                    />
                  ) : (
                    <div className="flex h-full min-h-[45dvh] w-full flex-col items-center justify-center sm:min-h-[550px]">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium text-foreground">
                        A gerar o documento...
                      </p>
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
                  className="min-h-[55dvh] max-w-full sm:min-h-[600px]"
                  onEditorReady={handleEditorReady}
                  onImageUpload={handleToolbarImageUpload}
                  isImageUploading={isImageUploading}
                  rightHeaderContent={
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                      {showUpdateIndicator && (
                        <span className="text-sm font-medium text-primary animate-pulse flex items-center gap-1">
                          ✨ Documento Refinado
                        </span>
                      )}
                      {!isSubscriptionLoading && !isPremium && (
                        <Link
                          href={Routes.CHECKOUT}
                          className="hidden md:inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-50 to-yellow-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:from-amber-950/40 dark:to-yellow-950/40 dark:text-amber-300 dark:hover:bg-amber-900/30"
                          title="Requer Scooli Pro: faz upgrade para gerar imagens automáticas"
                        >
                          <Crown className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
                          <span className="whitespace-nowrap">Imagens Pro</span>
                          <span className="hidden xl:inline-flex rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200">
                            Upgrade
                          </span>
                        </Link>
                      )}
                      {isGenerating && (
                        <div className="flex items-center space-x-2 text-primary">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm font-medium hidden sm:inline">
                            A gerar...
                          </span>
                        </div>
                      )}
                      <ShareButton
                        title={resolvedTitle || defaultTitle}
                        content={content}
                        disabled={isGenerating || !content}
                        documentId={documentId}
                        grade={activeDocument?.gradeLevel || ""}
                        subject={activeDocument?.subject || ""}
                        resourceType={activeDocument?.documentType || ""}
                        sharedStatus={activeDocument?.sharedResourceStatus}
                      />
                      <DownloadButton
                        title={resolvedTitle || defaultTitle}
                        content={content}
                        images={images}
                        isProUser={isPremium}
                        disabled={isGenerating || !content}
                      />
                    </div>
                  }
                />
              </>
            )}
          </div>

          <div className="sticky top-2 hidden self-start lg:block">
            <AIChatPanel
              onChatSubmit={handleChatSubmit}
              chatHistory={chatHistory}
              isStreaming={isStreaming || isChatting}
              error={error}
              placeholder={chatPlaceholder}
              title={chatTitle}
              sources={sources}
              showGenerationHint={!isSubscriptionLoading && !isPremium}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden pb-[max(env(safe-area-inset-bottom),0px)]">
        <AIChatPanel
          onChatSubmit={handleChatSubmit}
          chatHistory={chatHistory}
          isStreaming={isStreaming || isChatting}
          error={error}
          placeholder={chatPlaceholder}
          title={chatTitle}
          sources={sources}
          showGenerationHint={!isSubscriptionLoading && !isPremium}
        />
      </div>
    </>
  );
}
