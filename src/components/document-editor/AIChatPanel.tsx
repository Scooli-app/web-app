"use client";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RagSource } from "@/shared/types/document";
import { cn } from "@/shared/utils/utils";
import { FileText, MessageCircle, Send, Sparkles } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------

interface SuggestionChip {
  label: string;
  message: string;
}

const SUGGESTION_CHIPS: Record<string, SuggestionChip[]> = {
  lessonPlan: [
    { label: "Melhora a estrutura ✏️", message: "Melhora a estrutura e organização da aula." },
    { label: "Adiciona atividades práticas 🎯", message: "Adiciona atividades práticas e interativas à aula." },
    { label: "Simplifica a linguagem 🔤", message: "Simplifica a linguagem para ser mais acessível aos alunos." },
    { label: "Adiciona critérios de avaliação 📋", message: "Adiciona critérios de avaliação detalhados." },
  ],
  quiz: [
    { label: "Adiciona mais perguntas ➕", message: "Adiciona mais 5 perguntas ao quiz." },
    { label: "Aumenta a dificuldade 🎯", message: "Aumenta o nível de dificuldade das perguntas." },
    { label: "Explica as respostas 💡", message: "Adiciona uma explicação para cada resposta correta." },
    { label: "Varia os tipos de perguntas 🔄", message: "Varia os tipos de perguntas com verdadeiro/falso e resposta curta." },
  ],
  test: [
    { label: "Adiciona mais exercícios ➕", message: "Adiciona mais exercícios ao teste." },
    { label: "Aumenta a dificuldade 🎯", message: "Aumenta o nível de dificuldade das questões." },
    { label: "Adiciona cotações 📊", message: "Adiciona cotações a cada questão do teste." },
    { label: "Melhora as instruções 📋", message: "Melhora as instruções de cada secção do teste." },
  ],
  worksheet: [
    { label: "Adiciona mais exercícios ➕", message: "Adiciona mais exercícios à ficha de trabalho." },
    { label: "Simplifica as instruções 🔤", message: "Simplifica as instruções para serem mais claras." },
    { label: "Adiciona exemplos resolvidos 💡", message: "Adiciona exemplos resolvidos antes dos exercícios." },
    { label: "Melhora a conclusão 📝", message: "Melhora a secção de conclusão da ficha." },
  ],
  presentation: [
    { label: "Adiciona mais slides ➕", message: "Adiciona mais slides à apresentação." },
    { label: "Melhora o slide de título ✏️", message: "Melhora o slide de título e introdução." },
    { label: "Adiciona notas do apresentador 📋", message: "Adiciona notas do apresentador a cada slide." },
    { label: "Simplifica o conteúdo 🔤", message: "Simplifica o conteúdo dos slides para ser mais visual e direto." },
  ],
};

const DEFAULT_SUGGESTIONS: SuggestionChip[] = [
  { label: "Melhora a introdução ✏️", message: "Melhora a introdução do documento." },
  { label: "Adiciona mais exemplos 📚", message: "Adiciona mais exemplos práticos ao documento." },
  { label: "Simplifica a linguagem 🔤", message: "Simplifica a linguagem para ser mais acessível." },
  { label: "Adiciona uma conclusão 📝", message: "Adiciona ou melhora a conclusão do documento." },
];

function SuggestionChips({
  documentType,
  onChipClick,
  disabled,
}: {
  documentType?: string;
  onChipClick: (chip: SuggestionChip) => void;
  disabled?: boolean;
}) {
  const chips = documentType
    ? (SUGGESTION_CHIPS[documentType] ?? DEFAULT_SUGGESTIONS)
    : DEFAULT_SUGGESTIONS;

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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  hasUpdate?: boolean;
  /** When true, render Sim/Não quick-action buttons below the message */
  imageRegenOffer?: boolean;
  /** Set to true after user clicks Sim or Não to hide the buttons */
  imageRegenResolved?: boolean;
}

interface AIChatPanelProps {
  onChatSubmit: (message: string) => Promise<void>;
  chatHistory: ChatMessage[];
  isStreaming?: boolean;
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
  /** Document id used for PostHog event properties */
  documentId?: string;
}

function Tabs({
  activeTab,
  onTabChange,
  hasSources = false,
}: {
  activeTab: "assistant" | "sources";
  onTabChange: (tab: "assistant" | "sources") => void;
  hasSources?: boolean;
}) {
  return (
    <div className="flex p-1 bg-muted/50 rounded-xl mb-4">
      <button
        onClick={() => onTabChange("assistant")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-lg",
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
        Conversa
      </button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn("flex-1 flex", !hasSources && "cursor-not-allowed")}
            >
              <button
                onClick={(e) => {
                  if (!hasSources) {
                    e.preventDefault();
                    return;
                  }
                  onTabChange("sources");
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-lg w-full",
                  activeTab === "sources"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  !hasSources && "opacity-50 pointer-events-none",
                )}
                aria-disabled={!hasSources}
                type="button"
              >
                <FileText
                  className={cn(
                    "w-4 h-4",
                    activeTab === "sources" ? "text-primary" : "",
                  )}
                />
                Fontes
              </button>
            </div>
          </TooltipTrigger>
          {!hasSources && (
            <TooltipContent>
              <p>Este documento foi gerado sem recurso a fontes externas.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function ChatContent({
  chatHistory,
  isStreaming,
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
}: {
  chatHistory: ChatMessage[];
  isStreaming: boolean;
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
}) {
  const isDesktop = variant === "desktop";
  const [activeTab, setActiveTab] = useState<"assistant" | "sources">(
    "assistant",
  );

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300",
        isDesktop
          ? "h-[min(70dvh,760px)] border-border bg-card/50 backdrop-blur-sm lg:h-[calc(100dvh-12rem)]"
          : "h-full border-0 shadow-none bg-transparent",
      )}
    >
      <div className="px-4 py-4 md:px-6">
        <Tabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasSources={sources.length > 0}
        />
      </div>

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
                  <p className="text-sm font-medium">Como posso ajudar hoje?</p>
                </div>
              )}
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 relative",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto rounded-tr-none"
                      : "bg-muted text-foreground mr-auto rounded-tl-none border border-border/50",
                  )}
                >
                  {message.content}
                  {message.hasUpdate && (
                    <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      Documento Refinado
                    </div>
                  )}
                  {message.imageRegenOffer && !message.imageRegenResolved && onImageRegen && (
                    <div className="mt-2 pt-2 border-t border-border/30 flex gap-2">
                      <button
                        onClick={onImageRegen}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Sim, regenerar
                      </button>
                      <button
                        onClick={onDismissImageRegen}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isStreaming && (
                <div className="bg-muted text-foreground mr-auto p-3 rounded-2xl rounded-tl-none border border-border/50 animate-in fade-in duration-300">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            {/* Suggestion chips — visible until user sends their first follow-up */}
            {showSuggestions && onSuggestionClick && (
              <SuggestionChips
                documentType={documentType}
                onChipClick={onSuggestionClick}
                disabled={isStreaming}
              />
            )}

            {/* Chat Input */}
            <form
              onSubmit={handleSubmit}
              className={cn(
                "mt-auto flex gap-2 rounded-2xl border border-border/50 bg-background/50 p-1.5 transition-colors focus-within:border-primary/50",
                isDesktop
                  ? "mb-6"
                  : "mb-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]",
              )}
            >
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={placeholder}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 h-10 text-sm"
                disabled={isStreaming}
              />
              <Button
                type="submit"
                disabled={!chatMessage.trim() || isStreaming}
                size="icon"
                className="relative h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm overflow-visible"
              >
                <Send className="h-4 w-4" />
                {showGenerationHint && (
                  <GenerationCostHint
                    compact
                    className="pointer-events-none absolute -top-1.5 -right-1.5 border-primary/30 bg-background/95 text-primary shadow-sm"
                  />
                )}
              </Button>
            </form>
            <p
              className={cn(
                "text-center text-[11px] leading-4 text-muted-foreground/70",
                isDesktop ? "mb-4" : "mb-2",
              )}
            >
              A IA pode cometer erros. Revê sempre o conteúdo.
            </p>
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
  error,
  placeholder = "Faça uma pergunta ou peça ajuda...",
  title = "Assistente de IA",
  sources = [],
  showGenerationHint = false,
  onImageRegen,
  onDismissImageRegen,
  documentType,
  documentId,
}: AIChatPanelProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) {
      return;
    }

    setShowSuggestions(false);
    const userMessage = chatMessage;
    setChatMessage("");
    await onChatSubmit(userMessage);
  };

  const handleSuggestionClick = async (chip: SuggestionChip) => {
    if (isStreaming) return;
    setShowSuggestions(false);
    posthog.capture("ai_chat_suggestion_clicked", {
      suggestion_label: chip.label,
      suggestion_message: chip.message,
      document_type: documentType,
      document_id: documentId,
    });
    await onChatSubmit(chip.message);
  };

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
          error={error}
          placeholder={placeholder}
          title={title}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          handleSubmit={handleSubmit}
          chatContainerRef={chatContainerRef}
          variant="desktop"
          sources={sources}
          showGenerationHint={showGenerationHint}
          onImageRegen={onImageRegen}
          onDismissImageRegen={onDismissImageRegen}
          showSuggestions={showSuggestions}
          documentType={documentType}
          onSuggestionClick={handleSuggestionClick}
        />
      </div>

      {/* Mobile/Tablet: Floating button + Sheet */}
      <div className="lg:hidden">
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
            className="flex w-full max-w-none flex-col border-l border-border/50 p-0 sm:max-w-md"
          >
            <SheetHeader className="px-6 py-6 border-b border-border/50 bg-muted/20">
              <SheetTitle className="text-xl font-bold text-foreground tracking-tight">
                {title}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <ChatContent
                chatHistory={chatHistory}
                isStreaming={isStreaming}
                error={error}
                placeholder={placeholder}
                title={title}
                chatMessage={chatMessage}
                setChatMessage={setChatMessage}
                handleSubmit={handleSubmit}
                chatContainerRef={mobileChatContainerRef}
                variant="mobile"
                sources={sources}
                showGenerationHint={showGenerationHint}
                onImageRegen={onImageRegen}
                onDismissImageRegen={onDismissImageRegen}
                showSuggestions={showSuggestions}
                documentType={documentType}
                onSuggestionClick={handleSuggestionClick}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
