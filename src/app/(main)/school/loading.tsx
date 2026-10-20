import { PageContainer } from "@/components/layout/PageContainer";
import { PageSkeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the school dashboard (and stands in for its sub-pages): header, stat cards, two panels. */
export default function SchoolLoading() {
  return (
    <PageSkeleton>
      <PageContainer size="xl" contentClassName="py-4 sm:py-8">
        <SkeletonHeader icon titleClassName="w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} className="space-y-6 py-6 shadow-sm">
              <div className="flex items-start justify-between px-6">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
              <Skeleton className="mx-6 h-9 w-14" />
            </SkeletonCard>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} className="h-[300px] space-y-6 p-6 shadow-sm">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </PageContainer>
    </PageSkeleton>
  );
}
