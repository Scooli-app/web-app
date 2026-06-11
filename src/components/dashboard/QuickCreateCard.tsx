"use client";

import {
  buildQuickCreateUrl,
  parseQuickCreate,
  type QuickCreateParse,
} from "@/components/document-creation/quickCreate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

interface QuickStartExample {
  id: string;
  label: string;
  parse: QuickCreateParse;
}

const QUICK_START_EXAMPLES: QuickStartExample[] = [
  {
    id: "lesson_plan_fotossintese",
    label: "Plano: A fotossíntese · 3.º ano",
    parse: {
      documentType: "lessonPlan",
      topic: "A fotossíntese e a importância das plantas",
      schoolYear: 3,
      subjectId: "estudo_meio",
    },
  },
  {
    id: "test_fracoes",
    label: "Teste: Frações · 5.º ano",
    parse: {
      documentType: "test",
      topic: "Frações: comparação, ordenação e operações",
      schoolYear: 5,
      subjectId: "matematica",
    },
  },
  {
    id: "quiz_descobrimentos",
    label: "Quiz: Os Descobrimentos · 5.º ano",
    parse: {
      documentType: "quiz",
      topic: "Os Descobrimentos Portugueses",
      schoolYear: 5,
      subjectId: "hgp",
    },
  },
];

interface QuickCreateCardProps {
  isWorksheetCreationEnabled: boolean;
}

export function QuickCreateCard({
  isWorksheetCreationEnabled,
}: QuickCreateCardProps) {
  const router = useRouter();
  const [text, setText] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const parse = parseQuickCreate(trimmed);
    const requestedType = parse.documentType;
    if (parse.documentType === "worksheet" && !isWorksheetCreationEnabled) {
      parse.documentType = "lessonPlan";
    }

    posthog.capture("dashboard_quick_create_submitted", {
      requested_type: requestedType,
      routed_type: parse.documentType,
      has_year: parse.schoolYear !== undefined,
      has_subject: parse.subjectId !== undefined,
      text_length: trimmed.length,
    });

    router.push(buildQuickCreateUrl(parse));
  };

  const handleExampleClick = (example: QuickStartExample) => {
    posthog.capture("dashboard_quick_start_clicked", {
      example_id: example.id,
      document_type: example.parse.documentType,
    });
    router.push(buildQuickCreateUrl(example.parse));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          O que vais ensinar?
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='Ex: "Plano de aula sobre frações para o 3.º ano" ou apenas "frações"'
          className="h-10 flex-1 rounded-lg"
          aria-label="Descreve o que queres criar"
        />
        <Button
          type="submit"
          disabled={!text.trim()}
          className="h-10 shrink-0 rounded-lg px-4"
        >
          Criar com IA
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Exemplos:</span>
        {QUICK_START_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            onClick={() => handleExampleClick(example)}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  );
}
