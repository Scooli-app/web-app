import { WizardShell } from "@/components/document-creation/WizardShell";
import { PageSkeleton, SkeletonCard } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the new-plan wizard: header, four-step indicator, the step card and its footer buttons. */
export default function NewCurriculumPlanLoading() {
  return (
    <PageSkeleton>
      <WizardShell>
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-[28rem] max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          {["w-14", "w-12", "w-14", "w-14"].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <Skeleton className="h-px w-10" />}
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className={`hidden h-5 sm:block ${w}`} />
            </div>
          ))}
        </div>
        <SkeletonCard className="space-y-6 p-6 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-[60px]" />
            <Skeleton className="h-[60px]" />
          </div>
          <Skeleton className="h-[60px]" />
        </SkeletonCard>
        <div className="flex justify-between">
          <Skeleton className="h-9 w-[111px]" />
          <Skeleton className="h-9 w-[109px]" />
        </div>
      </WizardShell>
    </PageSkeleton>
  );
}
