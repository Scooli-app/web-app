import type { ReactNode } from "react";

interface StepHeadingProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small decorative illustration shown above the title. */
  illustration?: ReactNode;
}

export function StepHeading({ title, subtitle, illustration }: StepHeadingProps) {
  return (
    <div className="mb-6 space-y-2 sm:mb-8">
      {illustration && <div className="mb-3 sm:mb-5">{illustration}</div>}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
