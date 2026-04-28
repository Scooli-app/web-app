"use client";

import { Bot, Sparkles } from "lucide-react";

interface EmptyStateProps {
  /** Callback when a quick action chip is clicked */
  onQuickAction: (message: string) => void;
  /** Callback when a quick action chip is double-clicked */
  onQuickActionSubmit: (message: string) => void;
  /** Optional: Disable quick action chips */
  disabled?: boolean;
}

/** Quick action suggestions for new conversations */
const QUICK_ACTIONS = [
  {
    label: "Ideias de atividades ✨",
    message: "Podes dar-me ideias de atividades para a minha aula?",
  },
  {
    label: "Sugestões para uma aula 📚",
    message: "Preciso de sugestões para planear uma aula.",
  },
  {
    label: "Dúvidas sobre currículo ❓",
    message: "Tenho dúvidas sobre o currículo português.",
  },
  {
    label: "Como criar um documento 📝",
    message: "Como posso criar um plano de aula na Scooli?",
  },
];

/** Static welcome message (not streamed) */
export const WELCOME_MESSAGE = `Olá! 👋 Sou o Assistente Scooli.

Posso ajudar-te com:
- **Ideias** para atividades e aulas
- **Dúvidas** sobre pedagogia e currículo
- **Orientação** sobre como usar a Scooli

Em que posso ajudar hoje?`;

/**
 * Empty state component for the assistant chat.
 * Shows a welcome message and quick action chips.
 */
export function EmptyState({ onQuickAction, onQuickActionSubmit, disabled = false }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center animate-in fade-in duration-500">
      {/* Icon */}
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-primary animate-pulse" />
      </div>

      {/* Welcome text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Assistente Scooli
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Estou aqui para te ajudar com ideias, dúvidas pedagógicas e orientação
        sobre a aplicação.
      </p>

      {/* Quick action chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => !disabled && onQuickAction(action.message)}
            onDoubleClick={() => !disabled && onQuickActionSubmit(action.message)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-muted hover:bg-muted/80 text-foreground border border-border/50 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
