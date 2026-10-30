import { ClassListSkeleton } from "@/components/calendar/ClassListSkeleton";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the turmas page: back button + title, "Nova turma", class rows. */
export default function ClassesLoading() {
  return (
    <PageSkeleton className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-[131px]" />
      </div>
      <ClassListSkeleton />
    </PageSkeleton>
  );
}
