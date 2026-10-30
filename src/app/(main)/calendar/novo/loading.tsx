import { WizardShell } from "@/components/document-creation/WizardShell";
import { PageSkeleton, SkeletonCard } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the new-class wizard's first step: header, "how to create" and the two mode cards. */
export default function NewClassLoading() {
  return (
    <PageSkeleton>
      <WizardShell>
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} className="h-[200px] space-y-3 border-2 p-6">
                <Skeleton className="h-6 w-56" />
                {i === 0 && <Skeleton className="h-[22px] w-[103px]" />}
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </SkeletonCard>
            ))}
          </div>
        </div>
        <Skeleton className="h-9 w-[111px]" />
      </WizardShell>
    </PageSkeleton>
  );
}
