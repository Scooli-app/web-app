"use client";

import {
  buildQuickCreateUrl,
  parseQuickCreate,
  type QuickCreateParse,
} from "@/components/document-creation/quickCreate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

interface QuickStartExample {
  id: string;
  labelKey: string;
  /** Topic text comes from `documentCreation.quickStart.<id>.topic` — resolved at render time, not here. */
  parse: Omit<QuickCreateParse, "topic">;
}

const QUICK_START_EXAMPLES: QuickStartExample[] = [
  {
    id: "lesson_plan_fotossintese",
    labelKey: "lessonPlanFotossintese",
    parse: {
      documentType: "lessonPlan",
      schoolYear: 3,
      subjectId: "estudo_meio",
    },
  },
  {
    id: "test_fracoes",
    labelKey: "testFracoes",
    parse: {
      documentType: "test",
      schoolYear: 5,
      subjectId: "matematica",
    },
  },
  {
    id: "quiz_descobrimentos",
    labelKey: "quizDescobrimentos",
    parse: {
      documentType: "quiz",
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
  const t = useTranslations("dashboard.quickCreate");
  const tQuickStart = useTranslations("documentCreation.quickStart");
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
    const parse: QuickCreateParse = {
      ...example.parse,
      topic: tQuickStart(`${example.id}.topic`),
    };
    posthog.capture("dashboard_quick_start_clicked", {
      example_id: example.id,
      document_type: parse.documentType,
    });
    router.push(buildQuickCreateUrl(parse));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          {t("heading")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("placeholder")}
          className="h-10 w-full rounded-lg placeholder:text-xs sm:flex-1 sm:placeholder:text-sm"
          aria-label={t("inputAriaLabel")}
        />
        <Button
          type="submit"
          disabled={!text.trim()}
          className="h-10 w-full rounded-lg sm:w-auto sm:shrink-0 sm:px-4"
        >
          {t("submit")}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{t("examplesLabel")}</span>
        {QUICK_START_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            onClick={() => handleExampleClick(example)}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t(`examples.${example.labelKey}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
