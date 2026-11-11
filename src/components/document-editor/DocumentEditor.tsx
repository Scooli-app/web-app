"use client";

import { isJsonDoc } from "@/lib/documents/kind";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { useEditorAnalytics } from "@/hooks/useEditorAnalytics";
import { useGenerationStalled } from "@/hooks/useGenerationStalled";
import { uploadDocumentImage } from "@/services/api/document-images.service";
import { type ChatAttachment, discardPendingAiEdit, streamDocumentContent, uploadChatAttachment } from "@/services/api/document.service";
import { ApiRequestError } from "@/services/api/client";
import { AUTO_SAVE_DELAY } from "@/shared/config/constants";
import { Routes, type ChatChange, type ChatNewDocument, type Document } from "@/shared/types";
import { isFailedDocumentStatus, type RagSource } from "@/shared/types/document";
import { isUsableDocumentContent } from "@/shared/utils/documentContent";
import { escapeMarkdownImageAlt, htmlToMarkdown, markdownToHtml } from "@/shared/utils/markdown";
import { translate } from "@/i18n/translate";
import {
  chatWithDocument,
  clearLastChatAnswer,
  clearStreamInfo,
  fetchDocument,
  fetchDocumentImages,
  setGeneratingImages,
  setImageError,
  setCurrentDocument,
  setImages,
  upsertImage,
} from "@/store/documents/documentSlice";
import { fetchEntitlements } from "@/store/entitlements/entitlementsSlice";
import { selectEntitlementLoading } from "@/store/entitlements/selectors";
import {
  selectEditorState,
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";
import { selectIsPro } from "@/store/subscription/selectors";
import {
  fetchSubscription,
  fetchUsage,
} from "@/store/subscription/subscriptionSlice";
import { useAuth } from "@clerk/nextjs";
import type { Editor } from "@tiptap/react";
import { CheckCircle2, Crown, FileX, Loader2, Sparkles } from "lucide-react";
import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { DocumentNotFound } from "@/components/document-editor/DocumentNotFound";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { reportUiProblem } from "@/lib/reportUiProblem";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DiffToolbar } from "../editor/DiffToolbar";
import { computeDiff, markdownToNode } from "../editor/utils/diffEngine";
import { Button } from "../ui/button";
import { cn } from "@/shared/utils/utils";
import { EmptyState } from "../ui/empty-state";
import RichTextEditor from "../ui/rich-text-editor";
import { GenerationStalledNotice } from "../ui/generation-stalled-notice";
import AIChatPanel, { type ChatMessage } from "./AIChatPanel";
import {
  assistantMessageFromResponse,
  captureChatFeedback,
  captureChatMessageSent,
  captureChatResponse,
  loadChatHistory,
  newChatTurnId,
  startNewConversation,
  useChatFailureText,
  useCreateDocumentFromChat,
} from "@/hooks/useDocumentChat";

import { DocumentLessonContext } from "./DocumentLessonContext";
import { SuggestionBar } from "@/components/document-versions/SuggestionBar";
import { InlineTitle } from "./InlineTitle";
import CreateCalendarFromPlanButton from "./CreateCalendarFromPlanButton";
import DownloadButton from "./DownloadButton";
import ShareButton from "./ShareButton";
import { DocumentVersionsButton } from "@/components/document-versions/DocumentVersionsButton";


interface DocumentEditorProps {
  documentId: string;
  defaultTitle?: string;
  generateMessage?: string;
  chatTitle?: string;
  chatPlaceholder?: string;
  /** Called after any AI generation/edit stream for this document completes. */
  onGenerationComplete?: () => void;
}

type GenerationStepKey = "preparing" | "generating" | "reviewing" | "revised";

const STEP_ORDER: GenerationStepKey[] = [
  "preparing",
  "generating",
  "reviewing",
  "revised",
];

function GenerationProgress({ streamStatus }: { streamStatus: string }) {
  const t = useTranslations("editor.documentEditor");
  const GENERATION_STEPS: Array<{ key: GenerationStepKey; label: string; description: string }> = [
    { key: "preparing", label: t("stepPreparingLabel"), description: t("stepPreparingDescription") },
    { key: "generating", label: t("stepGeneratingLabel"), description: t("stepGeneratingDescription") },
    { key: "reviewing", label: t("stepReviewingLabel"), description: t("stepReviewingDescription") },
    { key: "revised", label: t("stepRevisedLabel"), description: t("stepRevisedDescription") },
  ];
  const currentIndex = STEP_ORDER.indexOf(streamStatus as GenerationStepKey);
  const activeStep =
    GENERATION_STEPS.find((s) => s.key === streamStatus) ?? GENERATION_STEPS[1];

  return (
    <div className="flex h-full min-h-[45dvh] w-full flex-col items-center justify-center gap-6 sm:min-h-[550px]">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-lg font-medium text-foreground">
          {activeStep.label}…
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {activeStep.description}
        </p>
      </div>
      {currentIndex >= 0 && (
        <div className="flex items-center gap-1.5">
          {GENERATION_STEPS.map((step, i) => {
            const isDone = i < currentIndex;
            const isActive = i === currentIndex;
            return (
              <div key={step.key} className="flex items-center gap-1.5">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                )}
                <span
                  className={`text-xs ${
                    isDone
                      ? "text-primary"
                      : isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                </span>
                {i < GENERATION_STEPS.length - 1 && (
                  <div
                    className={`w-6 h-px ${i < currentIndex ? "bg-primary" : "bg-muted-foreground/20"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const LEAKED_IMAGE_SEGMENT_TOKEN_PATTERN =
  /@@CODEX\\?_IMAGE\\?_SEGMENT\\?_\d+@@|CODEXIMAGESEGMENT\d+TOKEN/g;
const STABLE_DOCUMENT_IMAGE_TOKEN_PATTERN =
  /\{\{DOCUMENT_IMAGE:([0-9a-fA-F-]+)\}\}/g;

function containsLeakedImageSegmentTokens(content: string): boolean {
  return /@@CODEX\\?_IMAGE\\?_SEGMENT\\?_\d+@@|CODEXIMAGESEGMENT\d+TOKEN/i.test(
    content,
  );
}

function repairLeakedImageSegmentTokens(
  content: string,
  images: Array<{ id: string; alt: string }>,
): string {
  if (
    !content ||
    !images.length ||
    !containsLeakedImageSegmentTokens(content)
  ) {
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
    const safeAlt = escapeMarkdownImageAlt(
      image.alt || translate("editor.documentEditor.imageFallbackAlt"),
    );
    return `![${safeAlt}]({{DOCUMENT_IMAGE:${image.id}}})`;
  });
}

/** A background refresh that fails changes nothing: the editor keeps what it shows. */
const ignoreRefreshFailure = () => undefined;

export default function DocumentEditor({
  documentId,
  defaultTitle,
  chatTitle,
  chatPlaceholder,
  onGenerationComplete,
}: DocumentEditorProps) {
  const t = useTranslations("editor.documentEditor");
  const tChat = useTranslations("editor.aiChatPanel");
  const resolvedDefaultTitle = defaultTitle ?? t("defaultTitle");
  const resolvedChatTitle = chatTitle ?? tChat("defaultTitle");
  const resolvedChatPlaceholder = chatPlaceholder ?? tChat("defaultPlaceholder");
  const router = useRouter();
  const reviewRequested = useSearchParams().get("review") === "1";
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
  const isEntitlementLoading = useAppSelector(selectEntitlementLoading);
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
  const activeDocument =
    currentDocument?.id === documentId ? currentDocument : null;
  // Read from inside the stream effect without making it a dependency (that would restart the stream).
  const documentTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    documentTypeRef.current = currentDocument?.documentType;
  }, [currentDocument?.documentType]);
  const {
    getSessionId,
    registerActivity,
    registerAiSuggestionReceived,
    registerAutosave,
    registerChatMessage,
    registerEdit,
    registerImageUpload,
    registerImageUploadFailed,
    syncContent,
  } = useEditorAnalytics(activeDocument, content);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [displayContent, setDisplayContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [sources, setSources] = useState<RagSource[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>("");

  const eventSourceRef = useRef<(() => void) | null>(null);
  // Tracks which documentId has had a stream started; prevents the streaming
  // effect from opening a second connection when eventSourceRef is briefly null
  // (e.g., between onComplete nulling the ref and clearStreamInfo propagating).
  const streamStartedForIdRef = useRef<string | null>(null);
  // Set to true when onSources fires so the post-fetch sources sync doesn't
  // overwrite sources that arrived through the SSE stream for this document.
  const hasStreamingSourcesRef = useRef(false);
  const rawStreamRef = useRef("");
  const latestDisplayContentRef = useRef("");
  const latestContentRef = useRef(content);
  const accumulatedTitleRef = useRef("");
  const editorRef = useRef<Editor | null>(null);
  // Kept in a ref so the (large) stream effect doesn't need it in its deps.
  const onGenerationCompleteRef = useRef(onGenerationComplete);
  onGenerationCompleteRef.current = onGenerationComplete;
  const isChatInProgressRef = useRef(false);
  const pendingVisualCountRef = useRef(0);
  const completedVisualCountRef = useRef(0);
  const hasAttemptedLeakedTokenRepairRef = useRef(false);
  const completionFallbackTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Diff / Suggestions mode state
  const [isSuggestionsMode, setIsSuggestionsMode] = useState(false);
  // An AI proposal stored on the server and not reviewed yet (ENG-408): offered again when the document reopens.
  const [pendingProposal, setPendingProposal] = useState<string | null>(null);
  // The proposal can only be shown as suggestions once the page's editor exists.
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const editorReady = editorInstance !== null;
  // ENG-403: text selected in the page, offered to the assistant ("Pedir à IA"), and the one the next message is about.
  const [selectionAsk, setSelectionAsk] = useState<{ text: string; top: number; left: number } | null>(null);
  const [chatSelection, setChatSelection] = useState<string | null>(null);
  // ENG-410: a file read on the server, sent with the next message as source material.
  const [chatAttachment, setChatAttachment] = useState<ChatAttachment | null>(null);
  const historyLoadedForRef = useRef<string | null>(null);
  const chatFailureText = useChatFailureText();
  const createDocumentFromChat = useCreateDocumentFromChat();

  const [showChatNudge, setShowChatNudge] = useState(false);
  const prevIsGeneratingRef = useRef(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset document-scoped UI state when switching document IDs.
  // This prevents chat/source leakage between documents during route transitions.
  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current();
      eventSourceRef.current = null;
    }
    streamStartedForIdRef.current = null;
    hasStreamingSourcesRef.current = false;
    setIsStreaming(false);
    setChatHistory([]);
    setPendingProposal(null);
    historyLoadedForRef.current = null;
    setSources([]);
    setError("");
    setDisplayContent("");
    setDocumentTitle("");
    setShowUpdateIndicator(false);
    setIsSuggestionsMode(false);
    setStreamStatus("");
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
        const importedMessage = t("importedSuccess");
        import("sonner").then(({ toast }) => {
          toast.success(
            importedMessage,
            {
              duration: 8000,
            },
          );
        });
        // Remove the query param to avoid repeating on refresh
        router.replace(window.location.pathname, { scroll: false });
      }
    }
  }, [router, t]);

  useEffect(() => {
    dispatch(fetchSubscription());
    dispatch(fetchEntitlements());
  }, [dispatch]);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  }, []);

  const normalizePendingTitle = useCallback((rawTitle: string): string => {
    const trimmed = rawTitle?.trim() ?? "";
    if (!trimmed) {
      return "";
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

  const handleTrackedContentChange = useCallback(
    (nextContent: string) => {
      registerEdit(nextContent);
      handleContentChange(nextContent);
    },
    [handleContentChange, registerEdit],
  );

  const handleTrackedAutosave = useCallback(
    async (nextContent: string) => {
      registerAutosave(nextContent);
      syncContent(nextContent);
      await handleAutosave(nextContent);
    },
    [handleAutosave, registerAutosave, syncContent],
  );

  // A restored version replaces the document in the store; useDocumentManager
  // then swaps the editor content for it without a page reload.
  const handleVersionRestored = useCallback(
    (restored: Document) => {
      dispatch(setCurrentDocument(restored));
    },
    [dispatch]
  );

  const handleToolbarImageUpload = useCallback(
    async (file: File) => {
      if (!currentDocument?.id || currentDocument.id !== documentId) {
        toast.error(t("imageUnavailable"));
        return;
      }

      const currentlyGenerating =
        isStreaming ||
        (streamInfo?.id === documentId && streamInfo?.status === "generating");

      if (currentlyGenerating || isImageUploading) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(t("invalidImageFile"));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("imageTooLarge"));
        return;
      }

      setIsImageUploading(true);
      try {
        const result = await uploadDocumentImage(currentDocument.id, file);
        dispatch(upsertImage(result.image));
        registerImageUpload(file, result.image);

        const stableToken =
          result.markdown.match(/\{\{DOCUMENT_IMAGE:[^}]+\}\}/)?.[0] ??
          `{{DOCUMENT_IMAGE:${result.image.id}}}`;
        const altText = escapeHtmlAttribute(result.image.alt || file.name);

        if (editorRef.current) {
          editorRef.current
            .chain()
            .focus()
            .insertContent(`<img src="${stableToken}" alt="${altText}" />`)
            .run();
        } else {
          const fallbackMarkdown =
            result.markdown ||
            `![${result.image.alt || t("imageFallbackAlt")}](${stableToken})`;
          const previousContent = latestContentRef.current;
          const nextContent = previousContent
            ? `${previousContent}\n\n${fallbackMarkdown}`
            : fallbackMarkdown;
          setContent(nextContent);
          syncContent(nextContent);
          await handleTrackedAutosave(nextContent);
        }

        dispatch(fetchDocumentImages(currentDocument.id));
        toast.success(t("imageAdded"));
      } catch (error: unknown) {
        registerImageUploadFailed(file, error);
        const apiMessage =
          typeof error === "object" && error !== null
            ? (
                error as {
                  response?: { data?: { error?: string; message?: string } };
                }
              ).response?.data?.error ||
              (
                error as {
                  response?: { data?: { error?: string; message?: string } };
                }
              ).response?.data?.message
            : null;
        const fallbackMessage =
          error instanceof Error
            ? error.message
            : t("imageUploadFailed");
        toast.error(apiMessage || fallbackMessage);
      } finally {
        setIsImageUploading(false);
      }
    },
    [
      currentDocument?.id,
      dispatch,
      documentId,
      handleTrackedAutosave,
      isStreaming,
      isImageUploading,
      registerImageUpload,
      registerImageUploadFailed,
      syncContent,
      streamInfo?.id,
      streamInfo?.status,
      setContent,
      t,
    ],
  );

  // Connect to SSE stream when we have stream info for this document
  useEffect(() => {
    // Only connect if we have stream info for this document and haven't already
    // started a stream for this documentId. Using a separate ref (instead of
    // checking eventSourceRef.current) prevents a second connection from opening
    // during the brief window between onComplete nulling the ref and
    // clearStreamInfo propagating through Redux.
    if (
      streamInfo &&
      streamInfo.id === documentId &&
      streamInfo.status === "generating" &&
      streamStartedForIdRef.current !== documentId
    ) {
      streamStartedForIdRef.current = documentId;
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
        // Build a getter so streamDocumentContent can fetch a fresh token on
        // every connection attempt (initial + any reconnect after a network blip).
        const tokenGetter = () => getToken(template ? { template } : undefined);
        const token = await tokenGetter();
        if (!token) {
          eventSourceRef.current = null;

          const finalStreamedTitle = accumulatedTitleRef.current;
          if (finalStreamedTitle) {
            setDocumentTitle(normalizePendingTitle(finalStreamedTitle));
          }

          setIsStreaming(false);
          setError(t("authError"));
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
          setStreamStatus("");
          pendingVisualCountRef.current = 0;
          completedVisualCountRef.current = 0;
          dispatch(clearStreamInfo());
          dispatch(setGeneratingImages(false));

          // rawStreamRef now holds decoded Markdown directly
          const fallbackContent =
            latestDisplayContentRef.current || rawStreamRef.current;
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
              // Content events now carry decoded Markdown directly
              // (no longer raw JSON fragments that need extraction)
              rawStreamRef.current += chunk;
              latestDisplayContentRef.current = rawStreamRef.current;
              setDisplayContent(rawStreamRef.current);
            },
            onTitle: (title) => {
              // Title now arrives as a complete string in a single event
              accumulatedTitleRef.current = title;
              setDocumentTitle(title);
            },
            onSources: (newSources) => {
              hasStreamingSourcesRef.current = true;
              setSources(newSources);
            },
            onStatus: (status) => {
              setStreamStatus(status);
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
                      t("imageGenDelayError"),
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
                      t("imageGenDelayError"),
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
              setStreamStatus("");
              pendingVisualCountRef.current = 0;
              completedVisualCountRef.current = 0;

              const chatAnswer = response.chatAnswer;
              const finalContent = isUsableDocumentContent(response.content)
                ? response.content
                : null;

              if (finalContent) {
                setContent(finalContent);
              }

              // Update sources if returned in response
              if (response.sources && response.sources.length > 0) {
                hasStreamingSourcesRef.current = true;
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

                    // Replace editor content with AI content and apply diff
                    // decorations as a single atomic transaction — two separate
                    // commands.X() dispatches here previously matched the
                    // "mismatched transaction" pattern already fixed elsewhere
                    // in this file for the diff accept/reject flow (see
                    // DiffExtension.ts).
                    const aiHtml = markdownToHtml(finalContent);
                    editor
                      .chain()
                      .setContent(aiHtml, { emitUpdate: false })
                      .setDiffChanges(diffChanges)
                      .run();
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
                // fetchDocument's fulfilled content can otherwise race with
                // the editor mutations above and trigger an editorKey bump
                // (remount) mid-transaction — mirrors the guard already used
                // around chatWithDocument in handleChatSubmit below.
                skipNextEditorKeyBumpRef.current = true;
                dispatch(fetchDocument(docId))
                  .unwrap()
                  .catch(ignoreRefreshFailure)
                  .finally(() => {
                    skipNextEditorKeyBumpRef.current = false;
                  });
                dispatch(fetchDocumentImages(docId));
              }
              dispatch(setGeneratingImages(false));
              dispatch(fetchUsage());
              dispatch(fetchEntitlements());
              onGenerationCompleteRef.current?.();

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
              reportUiProblem("generation_error_shown", {
                documentId,
                documentType: documentTypeRef.current,
                message: errorMsg,
              });
              clearCompletionFallback();
              eventSourceRef.current = null;
              setIsStreaming(false);
              pendingVisualCountRef.current = 0;
              completedVisualCountRef.current = 0;
              setError(errorMsg);
              setStreamStatus("");
              dispatch(clearStreamInfo());
              dispatch(setGeneratingImages(false));
            },
          },
          tokenGetter,
        )
          .then((cleanup) => {
            eventSourceRef.current = cleanup;
          })
          .catch((err) => {
            console.error("Failed to start streaming:", err);
            reportUiProblem("generation_stream_start_failed", {
              documentId,
              documentType: documentTypeRef.current,
              message: err instanceof Error ? err.message : null,
            });
            eventSourceRef.current = null;
            setIsStreaming(false);
            setError(t("streamStartError"));
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
    normalizePendingTitle,
    skipNextEditorKeyBumpRef,
    t,
  ]);

  // A document that is already broken when opened: failed, or "completed" with nothing in it.
  // Reported once per document per page load.
  const reportedBrokenOpenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeDocument || reportedBrokenOpenRef.current === activeDocument.id) {
      return;
    }
    const isStreamingNow =
      streamInfo?.id === activeDocument.id && streamInfo.status === "generating";
    if (isStreamingNow) {
      return;
    }
    if (isFailedDocumentStatus(activeDocument.status)) {
      reportedBrokenOpenRef.current = activeDocument.id;
      reportUiProblem("document_opened_failed", {
        documentId: activeDocument.id,
        documentType: activeDocument.documentType,
      });
    } else if (
      activeDocument.status === "completed" &&
      !isJsonDoc(activeDocument) &&
      !isUsableDocumentContent(activeDocument.content)
    ) {
      reportedBrokenOpenRef.current = activeDocument.id;
      reportUiProblem("document_opened_empty", {
        documentId: activeDocument.id,
        documentType: activeDocument.documentType,
      });
    }
  }, [activeDocument, streamInfo]);

  // Backend reports the document as failed while we are still attached to its stream
  // (e.g. the generation task died silently). Stop waiting and show the failure state
  // instead of leaving the editor in a generating state.
  // Only reacts to the transition into a failed status: a document that is already
  // failed when a retry starts (status not refetched yet) must not kill the new stream,
  // and one that is merely opened as failed is handled by the regular failed UI.
  const lastDocStatusRef = useRef<{ id: string; status: string } | null>(null);
  const failureErrorShownRef = useRef(false);
  useEffect(() => {
    const status = activeDocument?.status;
    const previous = lastDocStatusRef.current;
    lastDocStatusRef.current = activeDocument
      ? { id: activeDocument.id, status: activeDocument.status }
      : null;

    if (!isFailedDocumentStatus(status)) {
      if (failureErrorShownRef.current) {
        failureErrorShownRef.current = false;
        setError("");
      }
      return;
    }
    const alreadyFailed =
      !!previous &&
      previous.id === activeDocument?.id &&
      isFailedDocumentStatus(previous.status);
    const attachedToStream =
      eventSourceRef.current !== null ||
      (streamInfo?.id === documentId && streamInfo.status === "generating");
    if (alreadyFailed || !attachedToStream) {
      return;
    }
    if (completionFallbackTimeoutRef.current) {
      clearTimeout(completionFallbackTimeoutRef.current);
      completionFallbackTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setStreamStatus("");
    setError(t("generationFailedError"));
    failureErrorShownRef.current = true;
    if (streamInfo?.id === documentId) {
      dispatch(clearStreamInfo());
    }
  }, [activeDocument, documentId, dispatch, streamInfo?.id, streamInfo?.status, t]);

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

  // ENG-408: once the teacher has reviewed a proposal (whatever they kept was autosaved), the server copy goes.
  const finishProposalReview = useCallback(() => {
    setPendingProposal(null);
    void discardPendingAiEdit(documentId).catch(() => undefined);
  }, [documentId]);

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
        // Sync the final editor content back to state.
        // DiffExtension deliberately defers this callback past the transaction
        // that resolved the last change — reading getHTML() any earlier returns
        // the pre-transaction document and would persist the text the user just
        // rejected.
        const html = editor.getHTML();
        const markdown = htmlToMarkdown(html);
        setContent(markdown);
        void handleTrackedAutosave(markdown);
        finishProposalReview();
      }
    };

    return () => {
      storage.onDiffStateChange = null;
    };
  }, [finishProposalReview, handleTrackedAutosave, isSuggestionsMode, setContent]);

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
    if (currentDocument?.id !== documentId || isStreaming) {
      return;
    }
    if (currentDocument?.title) {
      setDocumentTitle(normalizePendingTitle(currentDocument.title));
    }
  }, [
    currentDocument?.id,
    currentDocument?.title,
    documentId,
    isStreaming,
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

    // One-click lesson documents carry a prompt the server assembled: not something the teacher wrote.
    const serverGenerated = currentDocument?.metadata?.promptServerGenerated === true;

    if (chatHistory.length === 0 && prompt && !serverGenerated) {
      setChatHistory([{ role: "user", content: prompt }]);
    }
  }, [
    currentDocument?.id,
    currentDocument?.metadata?.prompt,
    currentDocument?.metadata?.initialPrompt,
    currentDocument?.metadata?.initial_prompt,
    currentDocument?.metadata?.promptServerGenerated,
    documentId,
    chatHistory.length,
  ]);

  // Sync sources from currentDocument when document loads.
  // Skipped when the current stream already provided sources so that
  // post-stream fetchDocument calls don't overwrite SSE-sourced results.
  useEffect(() => {
    if (currentDocument?.id !== documentId || isStreaming) {
      return;
    }
    if (hasStreamingSourcesRef.current) {
      return;
    }
    const metadataSources = Array.isArray(currentDocument?.metadata?.sources)
      ? (currentDocument.metadata.sources as RagSource[])
      : [];
    setSources(currentDocument?.sources ?? metadataSources);
  }, [
    currentDocument?.id,
    currentDocument?.metadata?.sources,
    currentDocument?.sources,
    documentId,
    isStreaming,
  ]);

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
    void handleTrackedAutosave(repaired);
    toast.warning(
      t("imageTokenRepairWarning"),
    );
  }, [content, handleTrackedAutosave, images, setContent, t]);

  const dismissChatNudge = useCallback(() => {
    setShowChatNudge(false);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
  }, []);

  /**
   * Shows an AI version of the document as suggestions against what the editor has now. With pending review
   * (ENG-408) nothing is stored yet: accepting saves through the normal autosave, so when the diff engine finds
   * nothing to review the content is saved straight away instead of silently dropped.
   */
  const presentAiProposal = useCallback(
    (
      aiMarkdown: string,
      options: { pendingReview: boolean; baseDoc?: Editor["state"]["doc"] | null; originalHtml?: string | null },
    ): number => {
      const editor = editorRef.current;
      const aiContent = aiMarkdown.trim();
      if (!editor) {
        setContent(aiContent);
        if (options.pendingReview) void handleTrackedAutosave(aiContent);
        else syncContent(aiContent);
        return 0;
      }
      try {
        const aiNode = markdownToNode(aiContent, editor.schema);
        const diffChanges = computeDiff(options.baseDoc || editor.state.doc, aiNode);
        if (diffChanges.length > 0) {
          const storage = (
            editor.storage as unknown as Record<string, { originalContent?: string | null }>
          ).diff;
          if (storage) {
            storage.originalContent = options.originalHtml || editor.getHTML();
          }
          // Replace editor content with AI content and apply diff decorations as a single atomic transaction
          // (see matching comment in the SSE onComplete handler above).
          editor
            .chain()
            .setContent(markdownToHtml(aiContent), { emitUpdate: false })
            .setDiffChanges(diffChanges)
            .run();
          setIsSuggestionsMode(true);
          return diffChanges.length;
        }
        setContent(aiContent);
        if (options.pendingReview) void handleTrackedAutosave(aiContent);
        else syncContent(aiContent);
        return 0;
      } catch (err) {
        console.error("Error computing diff:", err);
        setContent(aiContent);
        if (options.pendingReview) void handleTrackedAutosave(aiContent);
        else syncContent(aiContent);
        return 0;
      }
    },
    [handleTrackedAutosave, setContent, syncContent],
  );

  /** Resolves false when the request failed: the panel then keeps the text in the input to send again. */
  const handleChatSubmit = useCallback(
    async (userMessage: string): Promise<boolean> => {
      if (!currentDocument?.id || currentDocument.id !== documentId) {
        return false;
      }

      dismissChatNudge();
      const selection = chatSelection ?? undefined;
      const attachment = chatAttachment ?? undefined;
      setChatHistory((prev) => [
        ...prev,
        {
          role: "user",
          content: userMessage,
          ...(selection ? { quote: selection } : {}),
          ...(attachment ? { attachmentName: attachment.name } : {}),
        },
      ]);
      setError("");
      registerChatMessage(userMessage);
      const turnId = newChatTurnId();
      const startedAt = Date.now();
      captureChatMessageSent({
        turnId,
        documentId: currentDocument.id,
        documentType: currentDocument.documentType ?? undefined,
        editor: "markdown",
        editorSessionId: getSessionId(),
        message: userMessage,
        imageCount: images.length,
        ...(selection ? { source: "selection" as const } : {}),
      });

      const editor = editorRef.current;
      const baseDocBefore = editor ? editor.state.doc : null;
      const originalHtmlBefore = editor ? editor.getHTML() : null;

      // Prevent content sync during the request
      isChatInProgressRef.current = true;
      skipNextEditorKeyBumpRef.current = true;

      // Keep any image nodes in "pending" state for the duration of the request
      // instead of racing past ImageBlockNodeView's 5s hydration timeout and
      // flashing "unavailable" while the freshly generated images are still
      // being fetched below.
      dispatch(setGeneratingImages(true));

      try {
        const response = await dispatch(
          chatWithDocument({ id: currentDocument.id, message: userMessage, pendingReview: true, selection, attachment }),
        ).unwrap();
        setChatSelection(null);
        setChatAttachment(null);
        captureChatResponse({
          turnId,
          documentId: currentDocument.id,
          documentType: currentDocument.documentType ?? undefined,
          editor: "markdown",
          editorSessionId: getSessionId(),
          startedAt,
          response,
        });
        // Await the refreshed image list so any images the new content
        // references are already in the store by the time that content is
        // rendered — otherwise ImageBlockNodeView can find no match yet and
        // fall back to "unavailable" until the page is manually reloaded.
        try {
          await dispatch(fetchDocumentImages(currentDocument.id)).unwrap();
        } catch {
          // Non-fatal — ImageBlockNodeView still has its own hydration wait.
        }

        // A question-only answer carries no document content — never treat it as an edit.
        const editedContent = isUsableDocumentContent(response.content)
          ? response.content
          : null;

        if (!response.chatAnswer && !editedContent) {
          reportUiProblem("chat_empty_reply", {
            documentId: currentDocument.id,
            documentType: currentDocument.documentType,
          });
        }

        if (response.chatAnswer) {
          setChatHistory((prev) => [
            ...prev,
            assistantMessageFromResponse(response, { hasUpdate: !!editedContent }),
          ]);
        }

        if (editedContent) {
          const count = presentAiProposal(editedContent, {
            pendingReview: !!response.pendingReview,
            baseDoc: baseDocBefore,
            originalHtml: originalHtmlBefore,
          });
          if (count > 0) registerAiSuggestionReceived(count);
          // The proposal now lives in the editor; the reopen banner is for proposals left behind.
          setPendingProposal(null);
        }

        // Update sources if available
        if (response.sources && response.sources.length > 0) {
          setSources(response.sources);
        }
        return true;
      } catch (failure) {
        captureChatResponse({
          turnId,
          documentId: currentDocument.id,
          documentType: currentDocument.documentType ?? undefined,
          editor: "markdown",
          editorSessionId: getSessionId(),
          startedAt,
          failure,
        });
        const text = chatFailureText(failure);
        reportUiProblem("chat_error_shown", {
          documentId: currentDocument.id,
          documentType: currentDocument.documentType,
          message: text,
        });
        setError(text);
        // The message goes back to the input (the panel keeps it): drop its bubble so a resend isn't shown twice.
        setChatHistory((prev) =>
          prev.length > 0 && prev[prev.length - 1].role === "user" && prev[prev.length - 1].content === userMessage
            ? prev.slice(0, -1)
            : prev,
        );
        // No document resync: with pending review (ENG-408) the server never stores a chat edit before the
        // teacher accepts it, so a failed or abandoned request cannot have changed the stored document. (A resync
        // also remounted the panel and lost the message kept in the input.) Images may still have been made.
        dispatch(fetchDocumentImages(currentDocument.id));
        return false;
      } finally {
        dispatch(setGeneratingImages(false));
        isChatInProgressRef.current = false;
        skipNextEditorKeyBumpRef.current = false;
      }
    },
    [
      chatAttachment,
      chatFailureText,
      chatSelection,
      currentDocument?.documentType,
      currentDocument?.id,
      dismissChatNudge,
      dispatch,
      documentId,
      getSessionId,
      images.length,
      presentAiProposal,
      registerAiSuggestionReceived,
      registerChatMessage,
      skipNextEditorKeyBumpRef,
    ],
  );

  // ENG-396: the stored conversation is shown when the document opens (the model already reads it).
  useEffect(() => {
    if (currentDocument?.id !== documentId || historyLoadedForRef.current === documentId) {
      return;
    }
    historyLoadedForRef.current = documentId;
    let cancelled = false;
    void loadChatHistory(documentId).then((messages) => {
      if (!cancelled && messages.length > 0) {
        setChatHistory((current) =>
          // Something was sent meanwhile: keep it after the stored turns.
          current.some((m) => !m.fromHistory && m.role === "assistant") ? [...messages, ...current] : messages,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentDocument?.id, documentId]);

  // ENG-408: a proposal left unreviewed is offered again when the document reopens.
  useEffect(() => {
    if (currentDocument?.id !== documentId) return;
    const pending = (currentDocument?.metadata as { pendingAiEdit?: { content?: unknown } } | undefined)
      ?.pendingAiEdit?.content;
    if (typeof pending === "string" && pending.trim() && pending.trim() !== (currentDocument?.content ?? "").trim()) {
      setPendingProposal(pending);
    }
    // Only on load: later metadata refreshes must not resurrect a proposal the teacher already handled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDocument?.id, documentId]);

  const handleReviewPendingProposal = useCallback(() => {
    if (!pendingProposal) return;
    posthog.capture("ai_pending_proposal_reviewed", { document_id: documentId });
    const count = presentAiProposal(pendingProposal, { pendingReview: true });
    setPendingProposal(null);
    if (count === 0) finishProposalReview();
  }, [documentId, finishProposalReview, pendingProposal, presentAiProposal]);

  const handleDiscardPendingProposal = useCallback(() => {
    posthog.capture("ai_pending_proposal_discarded", { document_id: documentId });
    finishProposalReview();
  }, [documentId, finishProposalReview]);

  // ENG-408: leaving with unresolved suggestions loses them; say so before the tab closes.
  useEffect(() => {
    if (!isSuggestionsMode) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const pendingCount = editorRef.current
        ? ((editorRef.current.storage as unknown as Record<string, { changes?: unknown[] }>).diff?.changes?.length ?? 1)
        : 1;
      posthog.capture("ai_suggestion_left_pending", { document_id: documentId, pending_count: pendingCount });
      event.preventDefault();
      event.returnValue = tChat("leaveWithPending");
      return tChat("leaveWithPending");
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [documentId, isSuggestionsMode, tChat]);

  // ENG-403: a non-trivial text selection in the page offers "Pedir à IA" next to it.
  useEffect(() => {
    const editor = editorInstance;
    if (!editor || editor.isDestroyed) return;
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || isSuggestionsMode || !editor.isFocused) {
        setSelectionAsk(null);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, " ").trim();
      if (text.length < 3) {
        setSelectionAsk(null);
        return;
      }
      const end = editor.view.coordsAtPos(to);
      setSelectionAsk({ text: text.slice(0, 1500), top: end.bottom + 6, left: end.left });
    };
    const hide = () => window.setTimeout(() => setSelectionAsk(null), 150);
    editor.on("selectionUpdate", update);
    editor.on("blur", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("blur", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [editorInstance, isSuggestionsMode]);

  const handleAttach = useCallback(
    async (file: File) => {
      setError("");
      try {
        const attachment = await uploadChatAttachment(documentId, file);
        setChatAttachment(attachment);
        posthog.capture("ai_chat_attachment_added", {
          document_id: documentId,
          kind: file.name.split(".").pop()?.toLowerCase() ?? null,
          truncated: attachment.truncated,
        });
      } catch (failure) {
        const code = failure instanceof ApiRequestError ? failure.code : null;
        const known = ["unsupported_type", "too_large", "no_text", "unreadable"];
        setError(tChat(`attachErrors.${code && known.includes(code) ? code : "unreadable"}`));
        posthog.capture("ai_chat_attachment_failed", { document_id: documentId, reason: code ?? "unknown" });
      }
    },
    [documentId, tChat],
  );

  const handleAskAboutSelection = useCallback(() => {
    if (!selectionAsk) return;
    setChatSelection(selectionAsk.text);
    setSelectionAsk(null);
    posthog.capture("ai_chat_selection_asked", { document_id: documentId, length: selectionAsk.text.length });
  }, [documentId, selectionAsk]);

  const handleNewConversation = useCallback(async () => {
    if (await startNewConversation(documentId)) {
      setChatHistory([]);
      setError("");
    }
  }, [documentId]);

  const handleChatFeedback = useCallback(
    (index: number, rating: "up" | "down") => {
      setChatHistory((prev) =>
        prev.map((m, i) => {
          if (i !== index) return m;
          captureChatFeedback({
            documentId,
            documentType: currentDocument?.documentType ?? undefined,
            editor: "markdown",
            rating,
            message: m,
          });
          return { ...m, feedback: rating };
        }),
      );
    },
    [currentDocument?.documentType, documentId],
  );

  // ENG-404: a change in the list scrolls the page to its section.
  const handleChangeClick = useCallback((change: ChatChange) => {
    const root = editorRef.current?.view.dom as HTMLElement | undefined;
    if (!root) return;
    const wanted = (change.section ?? "").trim().toLowerCase();
    const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6")) as HTMLElement[];
    const target =
      (wanted && headings.find((h) => h.textContent?.trim().toLowerCase() === wanted)) ||
      (wanted && headings.find((h) => h.textContent?.trim().toLowerCase().includes(wanted))) ||
      (root.querySelector(".diff-inserted, .diff-deleted, [data-diff-change-id]") as HTMLElement | null) ||
      null;
    if (!target) return;
    target.scrollIntoView({ behavior: "auto", block: "center" });
    // ProseMirror owns its DOM and drops classes added to it, so the flash is an overlay above the section.
    const rect = target.getBoundingClientRect();
    const flash = window.document.createElement("div");
    flash.className = "chat-change-highlight";
    Object.assign(flash.style, {
      position: "fixed",
      left: `${rect.left - 6}px`,
      top: `${rect.top - 4}px`,
      width: `${rect.width + 12}px`,
      height: `${rect.height + 8}px`,
      pointerEvents: "none",
      zIndex: "40",
    });
    window.document.body.appendChild(flash);
    window.setTimeout(() => flash.remove(), 1600);
    posthog.capture("ai_chat_change_clicked", { document_id: documentId, kind: change.kind });
  }, [documentId]);

  const handleNewDocumentFromChat = useCallback(
    async (request: ChatNewDocument) => {
      if (!currentDocument) return;
      const problem = await createDocumentFromChat(request, {
        id: currentDocument.id,
        title: currentDocument.title,
        subject: currentDocument.subject,
        gradeLevel: currentDocument.gradeLevel,
        duration: (currentDocument as { duration?: number | null }).duration ?? null,
        content: currentDocument.content,
        documentType: currentDocument.documentType,
      });
      if (problem) {
        toast.error(tChat("errors.server"));
      }
    },
    [createDocumentFromChat, currentDocument, tChat],
  );

  const isGenerating =
    isStreaming ||
    (streamInfo?.id === documentId && streamInfo?.status === "generating");
  const isDocumentFailed = isFailedDocumentStatus(activeDocument?.status);
  const isGenerationStalled = useGenerationStalled(isGenerating && !isDocumentFailed);
  const actionsDisabledReason = isGenerating
    ? t("actionsDisabledGenerating")
    : !content
      ? t("actionsDisabledNoContent")
      : undefined;
  // Only curriculum-plan imports carry an original format.
  const isFailedImport =
    !isGenerating && isDocumentFailed && Boolean(activeDocument?.originalFormat);
  // A generation that died left nothing to edit: say so instead of opening a blank page.
  const isFailedGeneration =
    !isGenerating && isDocumentFailed && !isFailedImport && !isUsableDocumentContent(content);
  const isCompletedEmpty =
    !isGenerating &&
    activeDocument?.status === "completed" &&
    !isJsonDoc(activeDocument) &&
    !isUsableDocumentContent(content);
  const resolvedTitle =
    documentTitle || normalizePendingTitle(activeDocument?.title || "");

  // Show chat nudge once when document generation finishes
  useEffect(() => {
    if (prevIsGeneratingRef.current && !isGenerating) {
      setShowChatNudge(true);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      nudgeTimerRef.current = setTimeout(() => setShowChatNudge(false), 8000);
    }
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Cleanup nudge timer on unmount
  useEffect(() => () => { if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current); }, []);

  // Handle exiting diff / suggestions mode
  const handleExitDiffMode = useCallback(() => {
    setIsSuggestionsMode(false);
    if (editorRef.current) {
      // Sync current editor content back to state
      const html = editorRef.current.getHTML();
      const markdown = htmlToMarkdown(html);
      setContent(markdown);
      void handleTrackedAutosave(markdown);
    }
    finishProposalReview();
  }, [finishProposalReview, handleTrackedAutosave, setContent]);

  if (isLoading && !isGenerating) return <DocumentEditorSkeleton />;

  if (!activeDocument?.id && !isGenerating) return <DocumentNotFound documentId={documentId} />;

  const shareButton = (
    <ShareButton
      title={resolvedTitle || resolvedDefaultTitle}
      content={content}
      disabled={isGenerating || !content}
      disabledReason={actionsDisabledReason}
      documentId={documentId}
      grade={activeDocument?.gradeLevel || ""}
      subject={activeDocument?.subject || ""}
      resourceType={activeDocument?.documentType || ""}
      sharedStatus={activeDocument?.sharedResourceStatus}
    />
  );
  const downloadButton = (
    <DownloadButton
      title={resolvedTitle || resolvedDefaultTitle}
      content={content}
      images={images}
      isProUser={isPremium}
      disabled={isGenerating || !content}
      disabledReason={actionsDisabledReason}
    />
  );
  const chatPanel = (
    <AIChatPanel
      onChatSubmit={handleChatSubmit}
      chatHistory={chatHistory}
      isStreaming={isStreaming || isChatting}
      disabled={isGenerating}
      error={error}
      placeholder={resolvedChatPlaceholder}
      title={resolvedChatTitle}
      sources={sources}
      showGenerationHint={!isEntitlementLoading && !isPremium}
      documentType={activeDocument?.documentType}
      documentId={documentId}
      nudge={showChatNudge}
      onNudgeDismiss={dismissChatNudge}
      onChangeClick={handleChangeClick}
      onNewDocument={handleNewDocumentFromChat}
      onNewConversation={handleNewConversation}
      onFeedback={handleChatFeedback}
      selection={chatSelection}
      onClearSelection={() => setChatSelection(null)}
      onAttach={handleAttach}
      attachment={chatAttachment}
      onClearAttachment={() => setChatAttachment(null)}
    />
  );
  // Curriculum plans carry wide tables: their page takes the desk's width instead of a reading width.
  const wide = activeDocument?.documentType === "curriculumPlan";

  // The same frame as the exercise and presentation editors: top bar, grey desk with the page, full-height chat.
  return (
    <>
      <div className="-m-3 flex w-full min-h-0 flex-1 flex-col overflow-hidden bg-muted/40 sm:-m-4 md:-m-6">
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2 max-md:gap-1.5 max-md:px-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 max-md:basis-full">
            <InlineTitle title={resolvedTitle || resolvedDefaultTitle} onSave={handleTitleSave} disabled={isGenerating || isSaving} />
            {showUpdateIndicator && (
              <span className="flex shrink-0 animate-pulse items-center gap-1 text-xs font-medium text-primary">
                ✨ {tChat("documentRefined")}
              </span>
            )}
          </div>
          {!isEntitlementLoading && !isPremium && (
            <Link
              href={Routes.CHECKOUT}
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-50 to-yellow-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:from-amber-950/40 dark:to-yellow-950/40 dark:text-amber-300 dark:hover:bg-amber-900/30"
              title={t("proTooltip")}
            >
              <Crown className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
              <span className="whitespace-nowrap">{t("proImagesLabel")}</span>
              <span className="hidden xl:inline-flex rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200">
                {t("upgrade")}
              </span>
            </Link>
          )}
          {activeDocument?.documentType === "curriculumPlan" && !isGenerating && content && (
            <CreateCalendarFromPlanButton plan={activeDocument} />
          )}
          {!isGenerating && <DocumentVersionsButton documentId={documentId} onRestored={handleVersionRestored} />}
          {shareButton}
          {downloadButton}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 max-md:px-2 max-md:py-3">
            <div className={cn("mx-auto flex w-full flex-col", wide ? "max-w-none" : "max-w-[820px]")}>
              {activeDocument && (
                <DocumentLessonContext classInfo={activeDocument.classInfo} documentId={activeDocument.id} />
              )}
              {activeDocument && (
                <SuggestionBar
                  documentId={activeDocument.id}
                  suggestion={activeDocument.pendingSuggestion}
                  contentFormat="markdown"
                  autoOpenReview={reviewRequested}
                />
              )}
              {imageError && (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {imageError}
                </div>
              )}
              {isGenerating ? (
                <div className="min-h-[50dvh] w-full overflow-auto rounded-md border border-border bg-card p-3 shadow-sm sm:min-h-[600px] sm:p-4">
                  {isGenerationStalled ? (
                    <div className="flex h-full min-h-[45dvh] w-full items-center justify-center sm:min-h-[550px]">
                      <GenerationStalledNotice />
                    </div>
                  ) : (
                    // Never show the raw markdown stream: keep the stepper until the formatted document is ready.
                    // Content chunks arriving while the status is still early mean it is generating.
                    <GenerationProgress
                      streamStatus={
                        displayContent &&
                        (!streamStatus || streamStatus === "preparing")
                          ? "generating"
                          : streamStatus
                      }
                    />
                  )}
                </div>
              ) : isFailedImport ? (
                // The content of a failed import is the server's error sentence, not a document.
                <EmptyState
                  size="inline"
                  icon={FileX}
                  title={t("importFailedTitle")}
                  description={t("importFailedDescription")}
                  actions={
                    <Button asChild size="sm">
                      <Link href={Routes.CURRICULUM_PLAN_IMPORT}>{t("importFailedRetry")}</Link>
                    </Button>
                  }
                />
              ) : isFailedGeneration ? (
                // Same footprint as the generating card it replaces, centred in it.
                <EmptyState
                  icon={FileX}
                  title={t("generationFailedTitle")}
                  description={t("generationFailedDescription")}
                  className="min-h-[50dvh] w-full justify-center bg-card sm:min-h-[600px]"
                  actions={
                    <Button asChild>
                      <Link href={Routes.DASHBOARD}>{t("generationFailedRetry")}</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  {isCompletedEmpty && (
                    <EmptyState
                      size="inline"
                      icon={FileX}
                      title={t("emptyDocumentTitle")}
                      description={t("emptyDocumentDescription")}
                      className="mb-3"
                      actions={
                        <Button asChild size="sm" variant="outline">
                          <Link href={Routes.DOCUMENTS}>{t("backToDocuments")}</Link>
                        </Button>
                      }
                    />
                  )}
                  {pendingProposal && editorReady && !isSuggestionsMode && !isGenerating && (
                    <div
                      className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5"
                      data-testid="pending-ai-proposal"
                    >
                      <p className="flex-1 text-sm font-medium text-foreground">{tChat("pendingReviewTitle")}</p>
                      <Button size="sm" onClick={handleReviewPendingProposal}>
                        {tChat("pendingReviewReview")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleDiscardPendingProposal}>
                        {tChat("pendingReviewDiscard")}
                      </Button>
                    </div>
                  )}
                  {isSuggestionsMode && editorRef.current && (
                    <DiffToolbar
                      editor={editorRef.current}
                      onExitDiffMode={handleExitDiffMode}
                    />
                  )}
                  {selectionAsk && (
                    <Button
                      type="button"
                      size="sm"
                      className="fixed z-50 h-8 gap-1.5 rounded-full px-3 text-xs shadow-lg"
                      style={{ top: selectionAsk.top, left: selectionAsk.left }}
                      // Keep the editor's selection: act before it blurs.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleAskAboutSelection();
                      }}
                      data-testid="ask-ai-selection"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {tChat("askAiSelection")}
                    </Button>
                  )}
                  <RichTextEditor
                    key={editorKey}
                    content={content}
                    onChange={handleTrackedContentChange}
                    onAutosave={handleTrackedAutosave}
                    className="min-h-[55dvh] max-w-full sm:min-h-[600px]"
                    page
                    onEditorReady={handleEditorReady}
                    onEditorActivity={registerActivity}
                    onImageUpload={handleToolbarImageUpload}
                    isImageUploading={isImageUploading}
                  />
                </>
              )}
            </div>
          </div>
          <aside className="hidden w-80 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-background lg:flex">
            {chatPanel}
          </aside>
        </div>
      </div>

      <div className="lg:hidden pb-[max(env(safe-area-inset-bottom),0px)]">
        {chatPanel}
      </div>
    </>
  );
}
