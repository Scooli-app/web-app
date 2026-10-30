"use client";

import { WeekBodySkeleton } from "@/components/dashboard/YourWeekCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/store/hooks";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";

/** Mirrors DashboardContent: week card (when enabled), quick-create card and the blank-document chips. */
export default function DashboardLoading() {
  const hasWeek = useAppSelector(selectIsHorarioPlanosEnabled);
  return (
    <PageSkeleton className="h-full">
      <PageContainer size="7xl" className="h-full" contentClassName="flex h-full flex-col py-1 sm:py-2">
        <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
          {hasWeek && (
            <section className="rounded-2xl border border-border bg-card p-3 shadow-md sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Skeleton className="h-7 w-80 max-w-full" />
                <div className="flex gap-1">
                  <Skeleton className="size-8" />
                  <Skeleton className="size-8" />
                </div>
              </div>
              <WeekBodySkeleton />
            </section>
          )}
          <div className="shrink-0 space-y-2">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-full sm:w-36" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 overflow-hidden px-1">
              <Skeleton className="mr-1 h-4 w-28 shrink-0" />
              {["w-32", "w-20", "w-40", "w-20", "w-36", "w-32"].map((w, i) => (
                <Skeleton key={i} className={`h-8 shrink-0 rounded-full ${w}`} />
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    </PageSkeleton>
  );
}
