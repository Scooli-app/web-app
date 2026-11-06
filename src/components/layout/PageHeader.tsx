import { cn } from "@/shared/utils/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-4 sm:mb-6 md:mb-8",
        // Wraps instead of squeezing: at 768 px with the sidebar open the title was crushed under the actions.
        actions && "sm:flex-row sm:flex-wrap sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className={cn("min-w-0", actions && "sm:flex-1 sm:basis-80")}>
        <div className="flex items-start gap-2.5 sm:gap-3">
          {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
