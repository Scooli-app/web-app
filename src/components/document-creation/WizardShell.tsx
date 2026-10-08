import type { ReactNode } from "react";

/**
 * Shared outer container for multi-step creation wizards (curriculum-plan/novo,
 * calendar/novo). Standardizes max-width and spacing so both wizards share the
 * same look — each wizard keeps its own header, step indicator, step content,
 * and nav bar logic as children.
 */
export function WizardShell({ children }: { children: ReactNode }) {
  // pb-24 leaves room to scroll the nav buttons (bottom-right) clear of the
  // floating assistant button, which otherwise covers "Seguinte" on a phone.
  return <div className="mx-auto w-full max-w-3xl space-y-8 px-4 pb-24 pt-8">{children}</div>;
}
