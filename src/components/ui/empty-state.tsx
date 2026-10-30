import { cn } from "@/shared/utils/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** One line: why it is empty or what appears here once it isn't. */
  description?: ReactNode;
  /** Primary (and optional secondary) action buttons/links. */
  actions?: ReactNode;
  /** "page" for a whole page/list, "inline" for a card or panel section. */
  size?: "page" | "inline";
  className?: string;
}

/**
 * The app-wide "nothing here yet" block. Use LoadError instead when a fetch
 * failed, so a network problem never reads as "you have nothing".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  size = "page",
  className,
}: EmptyStateProps) {
  const isPage = size === "page";

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border text-center",
        isPage ? "px-6 py-14" : "px-4 py-6",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl bg-muted text-muted-foreground",
            isPage ? "mb-4 h-12 w-12" : "mb-3 h-9 w-9",
          )}
        >
          <Icon className={isPage ? "h-6 w-6" : "h-4 w-4"} strokeWidth={1.75} />
        </div>
      )}
      <p className={cn("font-medium text-foreground", isPage ? "text-base" : "text-sm")}>
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "mt-1 max-w-md text-muted-foreground",
            isPage ? "text-sm" : "text-xs",
          )}
        >
          {description}
        </p>
      )}
      {actions && (
        <div className={cn("flex flex-wrap justify-center gap-2", isPage ? "mt-5" : "mt-3")}>
          {actions}
        </div>
      )}
    </div>
  );
}
