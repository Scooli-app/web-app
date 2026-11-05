"use client";

import {
  createContext,
  useContext,
  useEffect,
  type MutableRefObject,
} from "react";

/** What the shell footer shows for the current step. */
export interface FooterDisplay {
  stepId: number;
  canContinue: boolean;
  busy: boolean;
  continueLabel?: string;
  hideBack: boolean;
}

/** What the footer buttons call; kept in a ref so re-renders never re-register. */
export interface FooterHandlers {
  stepId: number;
  onContinue: () => void;
}

export interface FooterContextValue {
  setDisplay: (display: FooterDisplay) => void;
  handlersRef: MutableRefObject<FooterHandlers | null>;
}

export const FooterContext = createContext<FooterContextValue | null>(null);

interface FooterConfig {
  stepId: number;
  canContinue: boolean;
  busy?: boolean;
  continueLabel?: string;
  hideBack?: boolean;
  onContinue: () => void;
}

/** Each step declares its footer (Continue / Back) through this hook. */
export function useStepFooter(config: FooterConfig) {
  const ctx = useContext(FooterContext);
  const {
    stepId,
    canContinue,
    busy = false,
    continueLabel,
    hideBack = false,
    onContinue,
  } = config;

  useEffect(() => {
    if (ctx) ctx.handlersRef.current = { stepId, onContinue };
  });

  const setDisplay = ctx?.setDisplay;
  useEffect(() => {
    setDisplay?.({
      stepId,
      canContinue,
      busy,
      continueLabel,
      hideBack,
    });
  }, [setDisplay, stepId, canContinue, busy, continueLabel, hideBack]);
}
