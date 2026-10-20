import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const TEXT_LINES = ["w-3/5", "w-1/2", "w-2/3"];

/** Mirrors DocumentEditor: title row, editor card (toolbar + body) and the assistant panel. */
export function DocumentEditorSkeleton() {
  return (
    <PageSkeleton className="flex flex-1 flex-col">
      <div className="mb-2 flex items-start justify-between gap-4">
        <Skeleton className="h-8 w-[28rem] max-w-full sm:h-9" />
        <Skeleton className="mt-2 hidden h-4 w-20 sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-h-[50dvh] rounded-xl border border-border bg-card sm:min-h-[600px]">
          <div className="flex h-[59px] items-center gap-2 border-b border-border px-3">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="hidden size-7 sm:block" />
            ))}
            <div className="flex-1" />
            <Skeleton className="h-8 w-[106px]" />
            <Skeleton className="h-8 w-[104px]" />
          </div>
          <div className="space-y-10 p-6 sm:p-8">
            {[0, 1, 2].map((section) => (
              <div key={section} className="space-y-4">
                <Skeleton className="h-7 w-56" />
                <div className="space-y-3 pl-5">
                  {TEXT_LINES.map((w, i) => (
                    <Skeleton key={i} className={`h-4 ${w}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden h-[708px] flex-col rounded-xl border border-border bg-card p-6 lg:flex">
          <Skeleton className="ml-auto h-[70px] w-[290px] rounded-2xl" />
          <div className="flex-1" />
          <div className="mb-3 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="mx-auto mt-4 h-3 w-56" />
        </div>
      </div>
    </PageSkeleton>
  );
}
