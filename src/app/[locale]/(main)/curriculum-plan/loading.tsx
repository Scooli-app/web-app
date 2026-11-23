import { PageSkeleton, SkeletonCard, SkeletonRows } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the planificações page: header, generate/import cards, the plans list. */
export default function CurriculumPlansLoading() {
  return (
    <PageSkeleton className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-[26rem] max-w-full" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <SkeletonCard key={i} className="space-y-6 py-6 shadow-sm">
            <Skeleton className="mx-6 h-5 w-40" />
            <div className="space-y-2 px-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="!mt-4 h-9 w-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <SkeletonRows rows={5} />
      </div>
    </PageSkeleton>
  );
}
