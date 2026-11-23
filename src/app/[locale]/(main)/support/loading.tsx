import { PageContainer } from "@/components/layout/PageContainer";
import { PageSkeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the support page: header, the two feedback cards, the feedback history. */
export default function SupportLoading() {
  return (
    <PageSkeleton>
      <PageContainer size="xl" contentClassName="py-4 sm:py-6 md:py-8">
        <div className="space-y-6 sm:space-y-8">
          <SkeletonHeader titleClassName="w-60" />
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} className="h-[200px] space-y-6 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-6 w-44" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="!mt-4 h-4 w-32" />
                </div>
              </SkeletonCard>
            ))}
          </div>
          <div className="mt-8 space-y-6">
            <Skeleton className="h-7 w-40" />
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-border/50 bg-card/50 p-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    </PageSkeleton>
  );
}
