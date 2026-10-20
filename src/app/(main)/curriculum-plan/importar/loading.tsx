import { PageSkeleton, SkeletonCard } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

function Field() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/** Mirrors the import page: header and the file + metadata form card. */
export default function ImportCurriculumPlanLoading() {
  return (
    <PageSkeleton className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <SkeletonCard className="space-y-6 py-6 shadow-sm">
        <Skeleton className="mx-6 h-4 w-40" />
        <div className="space-y-4 px-6">
          <Field />
          <Field />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field />
            <Field />
          </div>
          <Field />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field />
            <Field />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton className="h-9 w-[95px]" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </SkeletonCard>
    </PageSkeleton>
  );
}
