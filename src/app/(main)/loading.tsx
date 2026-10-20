import { PageContainer } from "@/components/layout/PageContainer";
import { PageSkeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback for routes without their own skeleton (admin pages, etc.): a header and content cards. */
export default function MainLoading() {
  return (
    <PageSkeleton>
      <PageContainer size="7xl" contentClassName="py-1 sm:py-2">
        <SkeletonHeader />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} className="h-40 space-y-3 p-5 shadow-sm">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </SkeletonCard>
          ))}
        </div>
      </PageContainer>
    </PageSkeleton>
  );
}
