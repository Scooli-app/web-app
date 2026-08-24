import type { ReactNode } from "react";

/**
 * Shared outer container for multi-step creation wizards (curriculum-plan/novo,
 * calendar/novo). Standardizes max-width and spacing so both wizards share the
 * same look — each wizard keeps its own header, step indicator, step content,
 * and nav bar logic as children.
 */
export function WizardShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">{children}</div>;
}
