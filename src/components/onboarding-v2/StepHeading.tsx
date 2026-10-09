import type { ReactNode } from "react";

interface StepHeadingProps {
  title: ReactNode;
  subtitle?: ReactNode;
}

export function StepHeading({ title, subtitle }: StepHeadingProps) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
