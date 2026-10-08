"use client";

import { GenerationProgress } from "@/components/document-creation/GenerationProgress";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { classCreationStep, type ClassCreationPhase } from "./useCreateClassWithTopics";

interface ClassTopicsProgressProps {
  phase: ClassCreationPhase;
  onRetry: () => void;
  onContinue: () => void;
}

/**
 * The wait between "Criar turma" and the finished calendar: progress while the
 * turma and its lesson topics are created, or — if the topics failed — the
 * choice to try again or carry on to the (already created) turma.
 */
export function ClassTopicsProgress({ phase, onRetry, onContinue }: ClassTopicsProgressProps) {
  const t = useTranslations("calendar.novo.generating");

  if (phase === "failed") {
    return (
      <div className="flex flex-col items-center space-y-4 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("failedTitle")}</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{t("failedDescription")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={onContinue}>
            {t("continue")}
          </Button>
          <Button onClick={onRetry}>{t("retry")}</Button>
        </div>
      </div>
    );
  }

  return (
    <GenerationProgress
      title={t("title")}
      subtitle={t("subtitle")}
      steps={t.raw("steps") as string[]}
      currentStep={classCreationStep(phase)}
    />
  );
}
