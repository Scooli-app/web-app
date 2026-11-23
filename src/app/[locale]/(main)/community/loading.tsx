import { ResourceGridSkeleton } from "@/components/community/ResourceGrid";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageSkeleton, SkeletonHeader } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the community library: header, library tabs, filters, resource grid. */
export default function CommunityLoading() {
  return (
    <PageSkeleton>
      <PageContainer size="7xl" contentClassName="py-1 sm:py-2">
        <div className="space-y-5 sm:space-y-6">
          <SkeletonHeader icon titleClassName="w-80" actions={2} />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-[133px]" />
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 min-w-[12rem] flex-1" />
            <Skeleton className="h-9 w-[93px]" />
            <Skeleton className="h-9 w-[137px]" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-[132px]" />
          </div>
          <ResourceGridSkeleton />
        </div>
      </PageContainer>
    </PageSkeleton>
  );
}
