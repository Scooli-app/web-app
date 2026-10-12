import type { ReactNode } from "react";

interface StepHeadingProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small decorative illustration shown above the title. */
  illustration?: ReactNode;
}

export function StepHeading({ title, subtitle, illustration }: StepHeadingProps) {
  return (
    <div className="mb-3 space-y-1 sm:mb-5 sm:space-y-1.5">
      {/* Hidden on short viewports (<= 760px tall) so the step always fits without scrolling. */}
      {illustration && (
        <div className="mb-2 [@media(max-height:760px)]:hidden">{illustration}</div>
      )}
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
    </div>
  );
}
