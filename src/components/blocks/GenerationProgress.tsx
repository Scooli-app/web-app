/**
 * GenerationProgress — full-screen overlay shown while a JSON document is
 * being generated. SCOOL-133.
 *
 * Four-step indicator + per-image progress bar + Portuguese copy. Not
 * presentation-specific by design; any future JSON doc type will share it.
 */
"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import type { GenerationPhase, ImageProgress } from "@/hooks/useGenerationProgress";

const STEPS: Array<{
  key: Exclude<GenerationPhase, "done">;
  label: string;
  caption: string;
}> = [
  {
    key: "preparing",
    label: "A preparar",
    caption: "A consultar o currículo e a montar o contexto.",
  },
  {
    key: "generating",
    label: "A gerar",
    caption: "A IA está a escrever os teus slides.",
  },
  {
    key: "reviewing",
    label: "A rever",
    caption: "A validar a estrutura e a qualidade do resultado.",
  },
];

const STEP_INDEX: Record<GenerationPhase, number> = {
  preparing: 0,
  generating: 1,
  reviewing: 2,
  done: 3,
};

export function GenerationProgress({
  phase,
  imageProgress,
  error,
}: {
  phase: GenerationPhase;
  imageProgress: ImageProgress | null;
  error: string | null;
}) {
  const activeIdx = STEP_INDEX[phase];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <h2 className="text-lg font-semibold text-foreground sm:text-xl">
          A criar a tua apresentação…
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Demora cerca de 30 a 60 segundos.
        </p>

        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <li key={step.key} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary bg-primary/10 text-primary",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done || active
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.caption}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {imageProgress && imageProgress.total > 0 ? (
          <div className="mt-6 rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Imagens</span>
              <span>
                {imageProgress.completed} / {imageProgress.total}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${
                    (imageProgress.completed / Math.max(1, imageProgress.total)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
