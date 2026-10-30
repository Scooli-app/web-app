import { PageSkeleton, SkeletonCard, SkeletonRows } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the sources page: header, the upload card, the uploaded sources list. */
export default function SourcesLoading() {
  return (
    <PageSkeleton className="max-w-3xl space-y-8 py-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <SkeletonCard className="space-y-6 p-6 shadow-sm">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-[148px] w-full rounded-xl" />
      </SkeletonCard>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <SkeletonRows rows={3} />
      </div>
    </PageSkeleton>
  );
}
