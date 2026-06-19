"use client";

import { Button } from "@/components/ui/button";
import { TUTORIAL_TOTAL_STEPS, useTutorial } from "@/contexts/TutorialContext";
import { cn } from "@/shared/utils/utils";
import { ArrowRight, BookOpen, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────

type WatchMode =
  | "mutation"  // MutationObserver on the element's subtree
  | "input"     // input/change events on an <input> inside the element
  | "click";    // click on the primary action button inside the element

interface TutorialStep {
  selector: string;
  title: string;
  /** Action-oriented description shown in the tooltip */
  description: string;
  /** Short hint below the description ("Select an option to continue") */
  hint: string;
  watchMode: WatchMode;
  /**
   * Returns true when the user has completed this step's required action.
   * For "click" mode this is unused — the click itself triggers completion.
   */
  isCompleted: (el: HTMLElement) => boolean;
  /**
   * When true the tooltip always shows a manual "Próximo" button regardless of
   * reactive completion (e.g. template is auto-selected by the app on load).
   */
  manualAdvance?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    selector: '[data-tutorial="grade"]',
    title: "Ano de escolaridade",
    description: "Clica no ano de escolaridade dos teus alunos.",
    hint: "Seleciona um ano para avançar automaticamente",
    watchMode: "mutation",
    isCompleted: (el) => !!el.querySelector('[aria-pressed="true"]'),
  },
  {
    selector: '[data-tutorial="subject"]',
    title: "Disciplina",
    description: "Abre o dropdown e escolhe a disciplina que ensinas.",
    hint: "Seleciona uma disciplina para avançar automaticamente",
    watchMode: "mutation",
    isCompleted: (el) => {
      const trigger = el.querySelector<HTMLElement>('[role="combobox"]');
      if (!trigger) return false;
      return !(trigger.textContent ?? "").includes("Selecione");
    },
  },
  {
    selector: '[data-tutorial="topic"]',
    title: "Tema da aula",
    description: "Escreve o tema que queres ensinar. Ex: 'A fotossíntese' ou 'Frações'.",
    hint: "Clica em Próximo quando estiveres pronto",
    watchMode: "mutation",
    isCompleted: (el) =>
      (el.querySelector("input")?.value.trim().length ?? 0) >= 3,
    manualAdvance: true,
  },
  {
    selector: '[data-tutorial="template"]',
    title: "Modelo do plano",
    description: "Um modelo foi selecionado automaticamente. Podes clicar para explorar outros.",
    hint: "Clica em Próximo para continuar",
    watchMode: "mutation",
    isCompleted: (el) =>
      !!el.querySelector('[aria-label*="Modelo selecionado"]'),
    manualAdvance: true,
  },
  {
    selector: '[data-tutorial="generate"]',
    title: "Gerar o plano de aula! 🎉",
    description: "Tudo pronto! Clica em 'Criar Plano de Aula' para gerar o teu primeiro plano de aula com IA.",
    hint: "Clica no botão para criar o teu plano de aula",
    watchMode: "click",
    isCompleted: () => false, // click handler drives this step
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

const PADDING = 10;
const TOOLTIP_WIDTH = 310;
const TOOLTIP_ESTIMATED_HEIGHT = 175;

interface HighlightRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intro card
// ─────────────────────────────────────────────────────────────────────────────

interface TutorialIntroProps {
  onStart: () => void;
  onSkip: () => void;
  leaving: boolean;
}

function TutorialIntro({ onStart, onSkip, leaving }: TutorialIntroProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[1002] flex items-center justify-center bg-black/70 backdrop-blur-sm",
        leaving
          ? "animate-out fade-out-0 duration-400 fill-mode-forwards"
          : "animate-in fade-in-0 duration-500",
      )}
    >
      <div
        className={cn(
          "relative mx-4 w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/40",
          leaving
            ? "animate-out fade-out-0 zoom-out-95 duration-350 fill-mode-forwards"
            : "animate-in fade-in-0 zoom-in-95 duration-500",
        )}
        style={{ animationDelay: leaving ? "0ms" : "80ms" }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-30"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 60% 0%, hsl(var(--primary)/0.35) 0%, transparent 70%)",
          }}
        />

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex gap-2">
            {[BookOpen, Zap].map((Icon, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground"
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Vamos criar o teu primeiro plano de aula!
        </h2>
        <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
          Em menos de um minuto vais gerar um plano de aula completo com IA.
          Vamos guiar-te passo a passo — é muito fácil.
        </p>

        <div className="my-5 space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-4">
          {[
            "Escolhe o ano e a disciplina",
            "Escreve o tema da aula",
            "Seleciona um modelo e gera",
          ].map((label, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-foreground">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Saltar tutorial
          </button>
          <Button
            type="button"
            onClick={onStart}
            className="rounded-2xl px-6 shadow-md"
          >
            Começar
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main overlay
// ─────────────────────────────────────────────────────────────────────────────

export function TutorialOverlay() {
  const { isTutorialActive, currentStep, totalSteps, nextStep, exitTutorial } =
    useTutorial();

  const [phase, setPhase] = useState<"intro" | "spotlight">("intro");
  const [introLeaving, setIntroLeaving] = useState(false);

  const [rect, setRect] = useState<HighlightRect | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  /** Shows the green "✓ Ótimo!" check before auto-advancing */
  const [stepCompleted, setStepCompleted] = useState(false);

  /**
   * True while a Radix portal (dropdown, modal) is open.
   * When true we hide the overlay panels so the popup is fully visible.
   */
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const activeElRef = useRef<HTMLElement | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const popupObserverRef = useRef<MutationObserver | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const computeRect = useCallback((el: HTMLElement): HighlightRect => {
    const r = el.getBoundingClientRect();
    return {
      top: r.top - PADDING,
      left: r.left - PADDING,
      right: r.right + PADDING,
      bottom: r.bottom + PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    };
  }, []);

  const updateRect = useCallback(() => {
    if (!activeElRef.current) return;
    setRect(computeRect(activeElRef.current));
  }, [computeRect]);

  const elevateElement = (el: HTMLElement) => {
    el.style.position = "relative";
    el.style.zIndex = "1001";
  };

  const restoreElement = (el: HTMLElement) => {
    el.style.position = "";
    el.style.zIndex = "";
  };

  const clearObserver = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  };

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  // Trigger the "step done" animation then advance
  const triggerCompletion = useCallback(() => {
    clearObserver();
    clearAdvanceTimer();
    setStepCompleted(true);
    advanceTimerRef.current = setTimeout(() => {
      setStepCompleted(false);
      nextStep();
    }, 650);
  }, [nextStep]);

  // ── Reset when tutorial (re)starts ─────────────────────────────────────────

  useEffect(() => {
    if (isTutorialActive) {
      setPhase("intro");
      setIntroLeaving(false);
      setStepCompleted(false);
    } else {
      setPhase("intro");
      setIntroLeaving(false);
      setStepCompleted(false);
      setRect(null);
      clearObserver();
      clearAdvanceTimer();
    }
  }, [isTutorialActive]);

  // ── Intro handlers ─────────────────────────────────────────────────────────

  const handleIntroStart = () => {
    setIntroLeaving(true);
    setTimeout(() => setPhase("spotlight"), 380);
  };

  // ── Spotlight: find element + set up reactive observer ─────────────────────

  useEffect(() => {
    if (!isTutorialActive || phase !== "spotlight") {
      setRect(null);
      setStepCompleted(false);
      clearObserver();
      clearAdvanceTimer();
      if (activeElRef.current) {
        restoreElement(activeElRef.current);
        activeElRef.current = null;
      }
      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
      return;
    }

    setStepCompleted(false);

    if (activeElRef.current) {
      restoreElement(activeElRef.current);
      activeElRef.current = null;
    }

    clearObserver();
    clearAdvanceTimer();
    setVp({ w: window.innerWidth, h: window.innerHeight });

    const stepDef = STEPS[currentStep];
    if (!stepDef) return;

    const attachObserver = (el: HTMLElement) => {
      clearObserver();

      if (stepDef.watchMode === "mutation") {
        const observer = new MutationObserver(() => {
          if (stepDef.isCompleted(el) && !stepDef.manualAdvance) {
            triggerCompletion();
          }
        });
        observer.observe(el, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        });
        observerRef.current = observer;
      }

      if (stepDef.watchMode === "input") {
        const input = el.querySelector("input");
        if (input) {
          const handler = () => {
            if (stepDef.isCompleted(el)) triggerCompletion();
          };
          input.addEventListener("input", handler);
          // Store cleanup on the element for later removal
          (el as HTMLElement & { _tutorialInputHandler?: () => void })
            ._tutorialInputHandler = handler;
        }
      }

      if (stepDef.watchMode === "click") {
        // Last step: clicking the generate button completes the tutorial
        const btn = el.querySelector("button:not([disabled])");
        if (btn) {
          const handler = () => {
            clearObserver();
            exitTutorial("completed");
          };
          btn.addEventListener("click", handler, { once: true });
        }
      }
    };

    const tryFind = () => {
      const el = document.querySelector<HTMLElement>(stepDef.selector);
      if (!el) return false;

      elevateElement(el);
      activeElRef.current = el;
      attachObserver(el);

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        if (activeElRef.current === el) {
          setRect(computeRect(el));
        }
      }, 350);

      return true;
    };

    if (!tryFind()) {
      retryRef.current = setInterval(() => {
        if (tryFind()) {
          const id = retryRef.current;
          if (id) clearInterval(id);
          retryRef.current = null;
        }
      }, 100);
    }

    return () => {
      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
      // Clean up input listener if any
      if (activeElRef.current) {
        const el = activeElRef.current as HTMLElement & {
          _tutorialInputHandler?: () => void;
        };
        const input = el.querySelector("input");
        if (input && el._tutorialInputHandler) {
          input.removeEventListener("input", el._tutorialInputHandler);
          delete el._tutorialInputHandler;
        }
      }
      clearObserver();
      clearAdvanceTimer();
    };
  }, [isTutorialActive, phase, currentStep, computeRect, triggerCompletion, exitTutorial]);

  // ── Keep rect updated on scroll / resize ───────────────────────────────────

  useEffect(() => {
    if (!isTutorialActive || phase !== "spotlight") return;
    const onScroll = () => updateRect();
    const onResize = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      updateRect();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isTutorialActive, phase, updateRect]);

  // ── Lower / restore the elevated element when a popup opens/closes ────────
  // elevateElement() sets z-index:1001 so it appears above the tutorial panels.
  // When a modal/dropdown opens it would punch through the dialog overlay (z-50).
  // Temporarily restore normal z-index while any popup is open.

  useEffect(() => {
    const el = activeElRef.current;
    if (!el) return;
    if (isPopupOpen) {
      restoreElement(el);
    } else {
      elevateElement(el);
      // Re-compute rect in case the element shifted after restore
      setTimeout(() => {
        if (activeElRef.current === el) setRect(computeRect(el));
      }, 50);
    }
  }, [isPopupOpen, computeRect]);

  // ── Detect open dropdowns / modals ────────────────────────────────────────
  // Hide both the overlay panels AND the tooltip while any popup is open so
  // the user can interact with it freely.
  //
  // We watch two signals:
  //  1. Body childList — Radix portals (Select content, Dialog) added to body
  //  2. Attribute mutations (data-state) on the whole document — catches
  //     SelectTrigger[data-state="open"] which changes inside the page tree

  useEffect(() => {
    if (!isTutorialActive || phase !== "spotlight") {
      setIsPopupOpen(false);
      if (popupObserverRef.current) {
        popupObserverRef.current.disconnect();
        popupObserverRef.current = null;
      }
      return;
    }

    const checkPopup = () => {
      const open = !!(
        // Radix Select content (portal to body)
        document.querySelector('[role="listbox"]') ||
        document.querySelector("[data-radix-select-content]") ||
        // Radix Select trigger open state (lives inside page tree)
        document.querySelector('[role="combobox"][data-state="open"]') ||
        // Any modal dialog (template browser, etc.)
        document.querySelector('[role="dialog"]:not([data-onboarding-modal])') ||
        document.querySelector('[data-slot="dialog-content"]')
      );
      setIsPopupOpen(open);
    };

    const observer = new MutationObserver(checkPopup);
    // childList on body catches portals; subtree+attributes catches data-state
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    popupObserverRef.current = observer;

    return () => {
      observer.disconnect();
      popupObserverRef.current = null;
      setIsPopupOpen(false);
    };
  }, [isTutorialActive, phase]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isTutorialActive) return null;

  if (phase === "intro") {
    return (
      <TutorialIntro
        leaving={introLeaving}
        onStart={handleIntroStart}
        onSkip={() => exitTutorial("skipped")}
      />
    );
  }

  if (!rect) return null;

  const stepDef = STEPS[currentStep];
  if (!stepDef) return null;

  const isLastStep = currentStep === totalSteps - 1;
  const showManualNext = stepDef.manualAdvance || isLastStep;
  const { w, h } = vp;

  const showBelow = rect.bottom + TOOLTIP_ESTIMATED_HEIGHT + 16 < h;
  const tooltipTop = showBelow
    ? rect.bottom + 12
    : Math.max(8, rect.top - TOOLTIP_ESTIMATED_HEIGHT - 12);
  const tooltipLeft = Math.max(12, Math.min(rect.left, w - TOOLTIP_WIDTH - 12));

  return (
    <>
      {/* ── Spotlight panels — hidden while a dropdown/modal is open ── */}
      {!isPopupOpen && (
        <>
          <div
            className="fixed inset-x-0 top-0 z-[1000] bg-black/60"
            style={{ height: Math.max(0, rect.top) }}
          />
          <div
            className="fixed inset-x-0 z-[1000] bg-black/60"
            style={{ top: Math.max(0, rect.bottom), bottom: 0 }}
          />
          <div
            className="fixed left-0 z-[1000] bg-black/60"
            style={{ top: rect.top, width: Math.max(0, rect.left), height: rect.height }}
          />
          <div
            className="fixed z-[1000] bg-black/60"
            style={{ top: rect.top, left: rect.right, right: 0, height: rect.height }}
          />

          {/* ── Highlight ring ── */}
          <div
            className="pointer-events-none fixed z-[1000] rounded-xl border-2 border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      )}

      {/* ── Tooltip — hidden while a dropdown/modal is open ── */}
      <div
        key={`tooltip-${currentStep}`}
        className={cn(
          "fixed z-[1002] rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/30 animate-in fade-in-0 zoom-in-95 duration-200",
          isPopupOpen && "hidden",
        )}
        style={{ top: tooltipTop, left: tooltipLeft, width: TOOLTIP_WIDTH }}
      >
        {/* Step indicator + title */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {currentStep + 1}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {stepDef.title}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {currentStep + 1}/{TUTORIAL_TOTAL_STEPS}
          </span>
        </div>

        {/* Description */}
        <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
          {stepDef.description}
        </p>

        {/* Completion feedback OR action hint */}
        {stepCompleted ? (
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-emerald-500 animate-in fade-in-0 zoom-in-95 duration-200">
            <CheckCircle2 className="h-4 w-4" />
            Ótimo! A avançar…
          </div>
        ) : (
          !showManualNext && (
            <p className="mb-3 text-xs italic text-muted-foreground/70">
              {stepDef.hint}
            </p>
          )
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => exitTutorial("skipped")}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Saltar tutorial
          </button>

          {showManualNext && !isLastStep && (
            <Button
              type="button"
              size="sm"
              onClick={nextStep}
              className="rounded-xl px-4"
            >
              Próximo
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
