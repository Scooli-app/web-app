"use client";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GenerationCostHint } from "@/components/ui/generation-cost-hint";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SourcesList } from "@/components/ui/sources-list";
import type { RagSource } from "@/shared/types/document";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { cn } from "@/shared/utils/utils";
import { FilePlus2, FileText, Loader2, Lock, MessageCircle, MinusCircle, PenLine, PlusCircle, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { ChatChange, ChatNewDocument, ChatOutcome } from "@/shared/types";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------

interface SuggestionChip {
  label: string;
  message: string;
}

function SuggestionChips({
  documentType,
  onChipClick,
  disabled,
}: {
  documentType?: string;
  onChipClick: (chip: SuggestionChip) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("editor.aiChatPanel");
  const suggestionsByType = t.raw("suggestions") as Record<string, SuggestionChip[]>;
  const chips = documentType
    ? (suggestionsByType[documentType] ?? suggestionsByType.default)
    : suggestionsByType.default;

  return (
    <div className="grid grid-cols-2 gap-1.5 mb-3">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onChipClick(chip)}
          className="w-full px-3 py-1.5 text-xs font-medium rounded-xl bg-muted hover:bg-primary/10 text-foreground border border-border/50 hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center leading-snug"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  hasUpdate?: boolean;
  /** When true, render Sim/Não quick-action buttons below the message */
  imageRegenOffer?: boolean;
  /** Set to true after user clicks Sim or Não to hide the buttons */
  imageRegenResolved?: boolean;
  /** What the turn did, decided by the server (ENG-394). */
  outcome?: ChatOutcome | null;
  /** False when the turn did not count as a generation (ENG-400). */
  charged?: boolean | null;
  /** Section-level changes of an edit, clickable to scroll to them (ENG-404). */
  changes?: ChatChange[] | null;
  /** Options of a clarifying question (ENG-406). */
  clarifyOptions?: string[] | null;
  /** Next-step chips (ENG-405). */
  followUps?: string[] | null;
  /** Offer to create a separate document (ENG-409). */
  newDocument?: ChatNewDocument | null;
  /** The reply describes a failure; styled as a warning. */
  isError?: boolean;
  /** Loaded from the stored conversation (ENG-396). */
  fromHistory?: boolean;
  /** The teacher's rating of this reply (ENG-387). */
  feedback?: "up" | "down";
}

interface AIChatPanelProps {
  /** Resolve with false when the message was not sent: the panel then keeps it in the input. */
  onChatSubmit: (message: string) => Promise<void | boolean>;
  chatHistory: ChatMessage[];
  isStreaming?: boolean;
  /** Document still generating: chat is locked until it is ready. */
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  title?: string;
  sources?: RagSource[];
  variant?: "desktop" | "mobile";
  showGenerationHint?: boolean;
  /** Called when the user clicks "Sim" on an image-regen offer */
  onImageRegen?: () => void;
  /** Called when the user clicks "Não" on an image-regen offer */
  onDismissImageRegen?: () => void;
  /** Document type used to pick contextual suggestion chips */
  documentType?: string;
  /** Overrides documentType for the suggestion chips only (e.g. "assessment" for block tests). */
  suggestionsKey?: string;
  /** Document id used for PostHog event properties */
  documentId?: string;
  /** Show post-generation nudge pointing users toward the assistant */
  nudge?: boolean;
  /** Called when the nudge is dismissed (X click or auto-timeout) */
  onNudgeDismiss?: () => void;
  /** Controls the mobile sheet from outside (e.g. a "Conversa" button in the parent). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  /** Scroll the editor to a changed section (ENG-404). */
  onChangeClick?: (change: ChatChange) => void;
  /** Create the offered document (ENG-409). Resolves when navigation started. */
  onNewDocument?: (request: ChatNewDocument) => Promise<void>;
  /** "Nova conversa" (ENG-396). */
  onNewConversation?: () => void;
  /** The teacher rated an assistant reply (ENG-387). */
  onFeedback?: (messageIndex: number, rating: "up" | "down") => void;
}

const CHANGE_ICONS = { added: PlusCircle, changed: PenLine, removed: MinusCircle } as const;

/** Honest staged status while the request runs: what is happening, never a fake percentage (ENG-402 interim). */
function ProgressIndicator() {
  const t = useTranslations("editor.aiChatPanel");
  const steps = t.raw("progress") as string[];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStep(1), 4000), setTimeout(() => setStep(2), 20000)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div
      className="bg-muted text-foreground mr-auto p-3 rounded-2xl rounded-tl-none border border-border/50 animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      data-testid="chat-progress"
    >
      <div className="flex items-center gap-2">
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
        </div>
        <span className="text-xs text-muted-foreground">{steps[Math.min(step, steps.length - 1)]}</span>
      </div>
    </div>
  );
}

function ChipRow({
  items,
  onPick,
  disabled,
  testId,
}: {
  items: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" data-testid={testId}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          disabled={disabled}
          onClick={() => onPick(item)}
          className="px-2.5 py-1 text-xs font-medium rounded-full bg-background hover:bg-primary/10 text-foreground border border-border hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// Below lg the tabs live in the phone/tablet sheet: touch-sized there.
function Tabs({
  activeTab,
  onTabChange,
}: {
  activeTab: "assistant" | "sources";
  onTabChange: (tab: "assistant" | "sources") => void;
}) {
  const t = useTranslations("editor.aiChatPanel");
  return (
    <div className="flex p-1 bg-muted/50 rounded-xl mb-4">
      <button
        onClick={() => onTabChange("assistant")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-lg max-lg:min-h-11",
          activeTab === "assistant"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sparkles
          className={cn(
            "w-4 h-4",
            activeTab === "assistant" ? "text-primary" : "",
          )}
        />
        {t("tabConversation")}
      </button>
      <button
        onClick={() => onTabChange("sources")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-lg max-lg:min-h-11",
          activeTab === "sources"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        type="button"
      >
        <FileText
          className={cn("w-4 h-4", activeTab === "sources" ? "text-primary" : "")}
        />
        {t("tabSources")}
      </button>
    </div>
  );
}

function ChatContent({
  chatHistory,
  isStreaming,
  disabled = false,
  error,
  placeholder,
  chatMessage,
  setChatMessage,
  handleSubmit,
  chatContainerRef,
  variant = "desktop",
  sources = [],
  showGenerationHint = false,
  onImageRegen,
  onDismissImageRegen,
  showSuggestions = false,
  documentType,
  onSuggestionClick,
  nudge,
  onNudgeDismiss,
  accountLocked = false,
  onChangeClick,
  onNewDocument,
  onFeedback,
  onChipPick,
  onNewConversation,
}: {
  chatHistory: ChatMessage[];
  isStreaming: boolean;
  disabled?: boolean;
  error?: string;
  placeholder: string;
  title: string;
  chatMessage: string;
  setChatMessage: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  variant?: "desktop" | "mobile";
  sources?: RagSource[];
  showGenerationHint?: boolean;
  onImageRegen?: () => void;
  onDismissImageRegen?: () => void;
  showSuggestions?: boolean;
  documentType?: string;
  onSuggestionClick?: (chip: SuggestionChip) => void;
  nudge?: boolean;
  onNudgeDismiss?: () => void;
  /** Read-only account: the send button shows a lock and opens the paywall. */
  accountLocked?: boolean;
  onChangeClick?: (change: ChatChange) => void;
  onNewDocument?: (request: ChatNewDocument) => Promise<void>;
  onFeedback?: (messageIndex: number, rating: "up" | "down") => void;
  onChipPick?: (text: string, kind: "clarify" | "followup") => void;
  onNewConversation?: () => void;
}) {
  const t = useTranslations("editor.aiChatPanel");
  const tLock = useTranslations("billing.lock");
  const isDesktop = variant === "desktop";
  const isInputLocked = isStreaming || disabled;
  const [activeTab, setActiveTab] = useState<"assistant" | "sources">(
    "assistant",
  );
  const [creatingDocument, setCreatingDocument] = useState(false);
  const lastIndex = chatHistory.length - 1;

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300",
        isDesktop
          ? "h-[min(70dvh,760px)] border-border bg-card/50 backdrop-blur-sm lg:h-[calc(100dvh-12rem)]"
          : "h-full border-0 shadow-none bg-transparent",
      )}
    >
      {nudge && onNudgeDismiss && (
        <div className="mx-4 mt-4 md:mx-6 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="flex-1 text-sm font-medium leading-snug text-foreground">
              {t("nudgeReady")}
            </p>
            <button
              type="button"
              onClick={onNudgeDismiss}
              className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("nudgeClose")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {sources.length > 0 ? (
        <div className="px-4 py-4 md:px-6">
          <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      ) : (
        <div className="h-4" />
      )}

      <div className="flex-1 overflow-hidden relative flex flex-col px-4 md:px-6">
        {activeTab === "assistant" ? (
          <>
            {/* Chat History */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20"
            >
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2">
                  <Sparkles className="w-8 h-8 text-primary/40" />
                  <p className="text-sm font-medium">{t("emptyStateHeading")}</p>
                </div>
              )}
              {chatHistory.length > 0 && onNewConversation && !isInputLocked && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onNewConversation}
                    title={t("newConversationHint")}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    data-testid="chat-new-conversation"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("newConversation")}
                  </button>
                </div>
              )}
              {chatHistory[0]?.fromHistory && (
                <p className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {t("previousConversation")}
                </p>
              )}
              {chatHistory.map((message, index) => {
                const isLast = index === lastIndex;
                const isAssistant = message.role === "assistant";
                const showChips = isAssistant && isLast && !isInputLocked && !!onChipPick;
                return (
                <div
                  key={index}
                  data-testid={isAssistant ? "chat-assistant-message" : "chat-user-message"}
                  data-outcome={message.outcome ?? undefined}
                  className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 relative whitespace-pre-line",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto rounded-tr-none"
                      : message.isError
                        ? "bg-destructive/5 text-foreground mr-auto rounded-tl-none border border-destructive/30"
                        : "bg-muted text-foreground mr-auto rounded-tl-none border border-border/50",
                  )}
                >
                  {message.content}
                  {message.hasUpdate && !message.changes?.length && (
                    <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      {t("documentRefined")}
                    </div>
                  )}
                  {isAssistant && message.changes && message.changes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30" data-testid="chat-change-list">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {t("changesTitle")}
                      </p>
                      <ul className="space-y-0.5">
                        {message.changes.map((change, i) => {
                          const Icon = CHANGE_ICONS[change.kind] ?? PenLine;
                          const label = `${t(`changeKinds.${change.kind}`)}: ${change.section ?? t("wholeDocument")}`;
                          return (
                            <li key={i}>
                              <button
                                type="button"
                                disabled={!onChangeClick || change.kind === "removed"}
                                onClick={() => onChangeClick?.(change)}
                                className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-xs hover:bg-background/70 disabled:cursor-default disabled:hover:bg-transparent"
                              >
                                <Icon className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                                <span className="truncate">{label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {isAssistant && message.outcome === "no_change" && (
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground">{t("noChangeBadge")}</p>
                  )}
                  {isAssistant && message.charged === false && message.outcome !== "clarify" && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("freeTurn")}</p>
                  )}
                  {isAssistant && message.newDocument && onNewDocument && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={creatingDocument || isInputLocked}
                      className="mt-2 h-8 gap-1.5 text-xs"
                      data-testid="chat-new-document"
                      onClick={async () => {
                        const request = message.newDocument;
                        if (!request) return;
                        setCreatingDocument(true);
                        try {
                          await onNewDocument(request);
                        } finally {
                          setCreatingDocument(false);
                        }
                      }}
                    >
                      {creatingDocument ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
                      {creatingDocument
                        ? t("newDocumentCreating")
                        : t("newDocumentAction", {
                            type: t.has(`documentTypes.${message.newDocument.type}`)
                              ? t(`documentTypes.${message.newDocument.type}`)
                              : message.newDocument.type,
                          })}
                    </Button>
                  )}
                  {showChips && message.clarifyOptions && message.clarifyOptions.length > 0 && (
                    <ChipRow
                      items={message.clarifyOptions}
                      onPick={(text) => onChipPick?.(text, "clarify")}
                      testId="chat-clarify-options"
                    />
                  )}
                  {showChips && message.followUps && message.followUps.length > 0 && (
                    <ChipRow
                      items={message.followUps}
                      onPick={(text) => onChipPick?.(text, "followup")}
                      testId="chat-follow-ups"
                    />
                  )}
                  {isAssistant && !message.isError && !message.fromHistory && onFeedback && (
                    <div className="mt-1.5 flex justify-end gap-1">
                      {message.feedback ? (
                        <span className="text-[11px] text-muted-foreground">{t("feedbackThanks")}</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={t("feedbackUp")}
                            title={t("feedbackUp")}
                            onClick={() => onFeedback(index, "up")}
                            className="rounded p-1 text-muted-foreground/70 hover:bg-background/70 hover:text-foreground"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={t("feedbackDown")}
                            title={t("feedbackDown")}
                            onClick={() => onFeedback(index, "down")}
                            className="rounded p-1 text-muted-foreground/70 hover:bg-background/70 hover:text-foreground"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {message.imageRegenOffer && !message.imageRegenResolved && onImageRegen && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <div className="flex gap-2">
                      <button
                        onClick={onImageRegen}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        {t("imageRegenYes")}
                      </button>
                      <button
                        onClick={onDismissImageRegen}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                      >
                        {t("imageRegenNo")}
                      </button>
                    </div>
                    <AiDisclaimer variant="compact" className="mt-1.5 text-left" />
                    </div>
                  )}
                </div>
                );
              })}

              {/* Progress while the request runs */}
              {isStreaming && <ProgressIndicator />}
            </div>

            {/* Suggestion chips — visible until user sends their first follow-up */}
            {showSuggestions && onSuggestionClick && (
              <SuggestionChips
                documentType={documentType}
                onChipClick={onSuggestionClick}
                disabled={isInputLocked}
              />
            )}

            {/* Chat Input */}
            <form
              onSubmit={handleSubmit}
              className={cn(
                "mt-auto flex gap-2 rounded-2xl border border-input bg-card p-1.5 transition-colors focus-within:border-primary/50",
                isDesktop
                  ? "mb-6"
                  : "mb-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]",
              )}
            >
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={placeholder}
                // Phone: 44 px tall, 16 px text so iOS doesn't zoom in on focus.
                className={cn("flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3", isDesktop ? "h-10 text-sm" : "h-11 text-base")}
                disabled={isInputLocked}
              />
              <Button
                type="submit"
                disabled={!chatMessage.trim() || isInputLocked}
                size="icon"
                className={cn("relative rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm overflow-visible", isDesktop ? "h-10 w-10" : "h-11 w-11")}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : accountLocked ? (
                  <>
                    <Lock className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{tLock("lockedHint")}</span>
                  </>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {showGenerationHint && (
                  <GenerationCostHint
                    compact
                    className="pointer-events-none absolute -top-1.5 -right-1.5 border-primary/30 bg-background/95 text-primary shadow-sm"
                  />
                )}
              </Button>
            </form>
            <AiDisclaimer className={isDesktop ? "mb-4" : "mb-2"} />
          </>
        ) : (
          <div className="flex-1 min-h-0 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SourcesList sources={sources} />
          </div>
        )}
        {error && (
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-xs font-medium animate-in shake-1">
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function AIChatPanel({
  onChatSubmit,
  chatHistory,
  isStreaming = false,
  disabled = false,
  error,
  placeholder,
  title,
  sources = [],
  showGenerationHint = false,
  onImageRegen,
  onDismissImageRegen,
  documentType,
  suggestionsKey,
  documentId,
  nudge = false,
  onNudgeDismiss,
  mobileOpen,
  onMobileOpenChange,
  onChangeClick,
  onNewDocument,
  onNewConversation,
  onFeedback,
}: AIChatPanelProps) {
  const t = useTranslations("editor.aiChatPanel");
  const tLock = useTranslations("billing.lock");
  // Read-only account (ENG-321): the chat stays visible; sending opens the paywall instead.
  const { isLocked: accountLocked, guard } = useAccountAccess();
  const resolvedPlaceholder = disabled
    ? t("generatingPlaceholder")
    : accountLocked
      ? tLock("chatPlaceholder")
      : (placeholder ?? t("defaultPlaceholder"));
  const resolvedTitle = title ?? t("defaultTitle");
  const [chatMessage, setChatMessage] = useState("");
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [ownOpen, setOwnOpen] = useState(false);
  const isOpen = mobileOpen ?? ownOpen;
  const setIsOpen = onMobileOpenChange ?? setOwnOpen;
  const keyboard = useKeyboardInset(isOpen);
  // The sheet is the below-lg chat: past lg the side panel shows the same chat, so close it.
  const setIsOpenRef = useRef(setIsOpen);
  setIsOpenRef.current = setIsOpen;
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mql.matches && setIsOpenRef.current(false);
    // Also when it is opened (e.g. controlled from outside) while already past lg.
    if (isOpen) onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [isOpen]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement | null>(null);
  const isStreamingRef = useRef(isStreaming);
  // Per typed request: did it fail? Then what the teacher typed stays in the input (even for the same error twice).
  const typedInFlightRef = useRef(false);
  const typedFailedRef = useRef(false);
  const wasStreamingRef = useRef(isStreaming);
  // While onChatSubmit is still pending, its own continuation decides whether the input is cleared: the request
  // can stop "streaming" before the parent says it failed, and clearing then would lose what the teacher typed.
  const submitPendingRef = useRef(false);
  const lockedInputValue = isStreaming && lockedMessage !== null ? lockedMessage : chatMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isStreaming || lockedMessage !== null || !chatMessage.trim()) {
      return;
    }
    if (!guard("generate")) return;

    setShowSuggestions(false);
    typedInFlightRef.current = true;
    typedFailedRef.current = false;
    const userMessage = chatMessage.trim();
    setLockedMessage(userMessage);
    setChatMessage(userMessage);
    submitPendingRef.current = true;
    try {
      const sent = await onChatSubmit(userMessage);
      submitPendingRef.current = false;
      if (sent === false) {
        typedFailedRef.current = true;
        typedInFlightRef.current = false;
        setLockedMessage(null);
        setShowSuggestions(true);
        return;
      }
      if (!isStreamingRef.current) {
        if (!typedFailedRef.current) setChatMessage("");
        setLockedMessage(null);
        typedInFlightRef.current = false;
      }
    } catch {
      submitPendingRef.current = false;
      // The request failed: keep what the teacher typed so they can send it again.
      typedFailedRef.current = true;
      typedInFlightRef.current = false;
      setLockedMessage(null);
    }
  };

  const handleSuggestionClick = (chip: SuggestionChip) =>
    sendQuickMessage(chip.message, { label: chip.label, position: "initial" });

  // Clarification options and follow-ups are sent like the initial chips (ENG-405, ENG-406).
  const handleChipPick = (text: string, kind: "clarify" | "followup") =>
    sendQuickMessage(text, { label: text, position: kind });

  const sendQuickMessage = async (
    message: string,
    analytics: { label: string; position: "initial" | "clarify" | "followup" },
  ) => {
    if (disabled || isStreaming || lockedMessage !== null) return;
    if (!guard("generate")) return;
    setShowSuggestions(false);
    typedInFlightRef.current = false;
    typedFailedRef.current = false;
    setLockedMessage(message);
    setChatMessage(message);
    posthog.capture("ai_chat_suggestion_clicked", {
      suggestion_label: analytics.label,
      suggestion_message: message,
      position: analytics.position,
      document_type: documentType,
      document_id: documentId,
    });
    try {
      if ((await onChatSubmit(message)) === false) {
        setLockedMessage(null);
        setShowSuggestions(true);
        return;
      }
      if (!isStreamingRef.current) {
        setChatMessage("");
        setLockedMessage(null);
      }
    } catch {
      setChatMessage("");
      setLockedMessage(null);
    }
  };

  const guardedImageRegen = onImageRegen
    ? () => {
        if (guard("generate")) onImageRegen();
      }
    : undefined;

  // An error shown while a typed request is in flight is that request failing (declared before the effect below,
  // so it runs first when both change in one render).
  useEffect(() => {
    if (error && typedInFlightRef.current) typedFailedRef.current = true;
  }, [error]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
    if (wasStreamingRef.current && !isStreaming && !submitPendingRef.current) {
      // A failed request keeps what the teacher typed, next to the error, so it can be sent again.
      if (!typedFailedRef.current) setChatMessage("");
      setLockedMessage(null);
      typedInFlightRef.current = false;
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Scroll chat to bottom when chatHistory changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
    if (mobileChatContainerRef.current) {
      mobileChatContainerRef.current.scrollTop =
        mobileChatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <>
      {/* Desktop: Grid-integrated sidebar panel */}
      <div className="hidden h-full min-h-0 w-full lg:block">
        <ChatContent
          chatHistory={chatHistory}
          isStreaming={isStreaming}
          disabled={disabled}
          error={error}
          placeholder={resolvedPlaceholder}
          title={resolvedTitle}
          chatMessage={lockedInputValue}
          setChatMessage={setChatMessage}
          handleSubmit={handleSubmit}
          chatContainerRef={chatContainerRef}
          variant="desktop"
          sources={sources}
          showGenerationHint={showGenerationHint}
          onImageRegen={guardedImageRegen}
          accountLocked={accountLocked}
          onDismissImageRegen={onDismissImageRegen}
          showSuggestions={showSuggestions}
          documentType={suggestionsKey ?? documentType}
          onSuggestionClick={handleSuggestionClick}
          nudge={nudge}
          onNudgeDismiss={onNudgeDismiss}
          onChangeClick={onChangeClick}
          onNewDocument={onNewDocument}
          onFeedback={onFeedback}
          onChipPick={handleChipPick}
          onNewConversation={onNewConversation}
        />
      </div>

      {/* Mobile/Tablet: Floating button + Sheet */}
      <div className="lg:hidden">
        {nudge && onNudgeDismiss && (
          <div className="fixed right-4 z-40 sm:right-6 animate-in fade-in slide-in-from-right-2 duration-300"
            style={{ bottom: "calc(max(env(safe-area-inset-bottom), 1rem) + 4.5rem + 4rem)" }}>
            <div className="relative rounded-2xl bg-foreground px-3.5 py-2.5 shadow-lg max-w-[190px]">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="text-xs font-medium leading-snug text-background">
                  {t("nudgeMobileTap")}
                </p>
                <button type="button" onClick={onNudgeDismiss} className="shrink-0 text-background/50 hover:text-background transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
              {/* Arrow pointing down toward button */}
              <div className="absolute -bottom-1.5 right-7 h-3 w-3 rotate-45 rounded-sm bg-foreground" />
            </div>
          </div>
        )}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              className="fixed right-4 z-50 h-14 w-14 rounded-full bg-primary shadow-lg transition-all duration-300 hover:scale-105 hover:bg-primary/90 hover:shadow-xl active:scale-95 sm:right-6 bottom-[calc(max(env(safe-area-inset-bottom),1rem)+4.5rem)]"
              size="icon"
            >
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
              {chatHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-background">
                  {chatHistory.length > 9 ? "9+" : chatHistory.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            largeClose
            className="flex w-full max-w-none flex-col border-l border-border/50 p-0 sm:max-w-md"
            style={keyboard ? { paddingBottom: keyboard } : undefined}
          >
            <SheetHeader className="px-6 py-6 border-b border-border/50 bg-muted/20">
              <SheetTitle className="text-xl font-bold text-foreground tracking-tight">
                {resolvedTitle}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <ChatContent
                chatHistory={chatHistory}
                isStreaming={isStreaming}
                disabled={disabled}
                error={error}
                placeholder={resolvedPlaceholder}
                title={resolvedTitle}
                chatMessage={lockedInputValue}
                setChatMessage={setChatMessage}
                handleSubmit={handleSubmit}
                chatContainerRef={mobileChatContainerRef}
                variant="mobile"
                sources={sources}
                showGenerationHint={showGenerationHint}
                onImageRegen={guardedImageRegen}
                accountLocked={accountLocked}
                onDismissImageRegen={onDismissImageRegen}
                showSuggestions={showSuggestions}
                documentType={suggestionsKey ?? documentType}
                onSuggestionClick={handleSuggestionClick}
                onChangeClick={(change) => {
                  setIsOpen(false);
                  onChangeClick?.(change);
                }}
                onNewDocument={onNewDocument}
                onFeedback={onFeedback}
                onChipPick={handleChipPick}
                onNewConversation={onNewConversation}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
