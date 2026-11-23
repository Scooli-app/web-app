import { DocumentSectionsSkeleton } from "@/components/ui/document-card-skeleton";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors DocumentsGallery: heading + actions, filter row, documents grouped by class. */
export default function DocumentsLoading() {
  return (
    <PageSkeleton>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-7 w-64 sm:h-8" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-[116px]" />
            <Skeleton className="h-8 w-[99px]" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 min-w-[12rem] flex-1" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-[198px]" />
          <Skeleton className="h-9 w-[132px]" />
        </div>
        <DocumentSectionsSkeleton />
      </div>
    </PageSkeleton>
  );
}
