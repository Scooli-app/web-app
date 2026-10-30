import { FormCard } from "@/components/document-creation/sections/FormCard";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** A label + control row, the shape of the lesson and topic cards. */
function RowCard() {
  return (
    <FormCard>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Skeleton className="h-5 w-28 sm:w-36" />
        <Skeleton className="h-10 w-full flex-1 rounded-lg" />
      </div>
    </FormCard>
  );
}

function ChipsCard({ chips }: { chips: string[] }) {
  return (
    <FormCard className="h-full">
      <Skeleton className="mb-3 h-5 w-36" />
      <div className="flex flex-wrap gap-2">
        {chips.map((w, i) => (
          <Skeleton key={i} className={`h-9 rounded-lg ${w}`} />
        ))}
      </div>
    </FormCard>
  );
}

/** Mirrors DocumentCreationPage (header, lesson, topic, class/subject, more options, submit). */
export function DocumentCreationSkeleton({ withVariant = false }: { withVariant?: boolean }) {
  return (
    <PageSkeleton className="overflow-x-clip">
      <div className="mx-auto max-w-4xl pb-2">
        <div className="mb-3">
          <Skeleton className="h-8 w-64 sm:h-9" />
          <Skeleton className="mt-1 h-5 w-80 max-w-full sm:h-6 sm:w-[28rem]" />
        </div>
        <div className="space-y-3">
          <RowCard />
          <RowCard />
          {withVariant && (
            <FormCard>
              <Skeleton className="mb-2 h-5 w-32" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[34px] rounded-lg" />
                ))}
              </div>
              <Skeleton className="mt-1.5 h-4 w-64" />
            </FormCard>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChipsCard chips={["w-[73px]", "w-[64px]", "w-[64px]", "w-[64px]", "w-[64px]", "w-[78px]", "w-[78px]"]} />
            <ChipsCard chips={["w-[108px]", "w-[94px]", "w-[132px]", "w-[108px]"]} />
          </div>
          <FormCard className="flex-row items-center gap-3 px-3 py-3 sm:px-4">
            <Skeleton className="size-4 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-56" />
            </div>
          </FormCard>
          <div className="space-y-1.5 py-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="mx-auto h-4 w-40" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}
