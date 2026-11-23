import { WeekSlotListSkeleton } from "@/components/calendar/ClassListSkeleton";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the turma page: back + colour + name, week navigator, the week's lessons. */
export default function ClassDetailLoading() {
  return (
    <PageSkeleton className="mx-auto max-w-5xl space-y-4 px-4 pb-24 pt-6 md:pb-6">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-9 shrink-0" />
        <Skeleton className="size-4 shrink-0 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2">
        <Skeleton className="size-9" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="size-9" />
      </div>
      <WeekSlotListSkeleton />
    </PageSkeleton>
  );
}
