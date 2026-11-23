import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

function SettingsCard({ titleWidth, children }: { titleWidth: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className={`h-7 ${titleWidth}`} />
      </div>
      {children}
    </div>
  );
}

/** Mirrors the settings page: header, profile card, teaching profile card, plan card. */
export default function SettingsLoading() {
  return (
    <PageSkeleton className="mx-auto max-w-4xl">
      <div className="mb-8">
        <Skeleton className="mb-2 h-9 w-48 sm:h-10" />
        <Skeleton className="h-7 w-80 max-w-full" />
      </div>
      <div className="space-y-6">
        <SettingsCard titleWidth="w-36">
          <div className="mb-6 flex items-center gap-4 rounded-xl bg-muted p-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-9 w-[118px]" />
        </SettingsCard>
        <SettingsCard titleWidth="w-32">
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-6 h-4 w-2/3" />
          <Skeleton className="mb-2 h-5 w-40" />
          <Skeleton className="mb-3 h-4 w-80 max-w-full" />
          <Skeleton className="mb-6 h-[42px] w-full rounded-xl" />
          <Skeleton className="mb-3 h-5 w-36" />
          <div className="flex flex-wrap gap-2">
            {["w-[72px]", "w-[92px]", "w-[92px]", "w-[74px]"].map((w, i) => (
              <Skeleton key={i} className={`h-9 rounded-lg ${w}`} />
            ))}
          </div>
        </SettingsCard>
        <SettingsCard titleWidth="w-40">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="mb-6 h-3 w-full rounded-full" />
          <Skeleton className="h-11 w-44 rounded-xl" />
        </SettingsCard>
      </div>
    </PageSkeleton>
  );
}
