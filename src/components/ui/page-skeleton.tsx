import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";

/** Root of a route skeleton: announces the loading state once to assistive tech. */
export function PageSkeleton({ className, children }: { className?: string; children: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")} className={cn("w-full", className)}>
      {children}
    </div>
  );
}

/** Same box as PageHeader (text-2xl / sm:text-3xl heading, optional description and actions). */
export function SkeletonHeader({
  titleClassName = "w-56",
  description = true,
  actions = 0,
  icon = false,
  className,
}: {
  titleClassName?: string;
  description?: boolean;
  actions?: number;
  icon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between md:mb-8", className)}>
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
        {icon && <Skeleton className="mt-0.5 size-6 shrink-0" />}
        <div className="min-w-0">
          <Skeleton className={cn("h-8 max-w-full sm:h-9", titleClassName)} />
          {description && <Skeleton className="mt-1.5 h-5 w-72 max-w-full sm:h-6 sm:w-96" />}
        </div>
      </div>
      {actions > 0 && (
        <div className="flex shrink-0 gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <Skeleton key={i} className="h-8 w-28" />
          ))}
        </div>
      )}
    </div>
  );
}

/** A bordered card shell for skeleton content. */
export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

/** List rows: icon, title + subtitle, trailing meta (e.g. a date) and chevron. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Skeleton className="size-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <Skeleton className="h-3.5 w-16 shrink-0" />
          <Skeleton className="size-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}
