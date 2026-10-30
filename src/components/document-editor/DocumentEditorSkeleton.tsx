import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const TEXT_LINES = ["w-3/5", "w-1/2", "w-2/3"];

/** Mirrors the shared editor frame (lesson plans, exercise documents): top bar, grey desk with the page, chat panel. */
export function DocumentEditorSkeleton() {
  return (
    <PageSkeleton className="-m-3 flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/40 sm:-m-4 md:-m-6">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-background px-4 py-2">
        <Skeleton className="h-5 w-72 max-w-[60%]" />
        <div className="flex-1" />
        <Skeleton className="hidden h-8 w-24 sm:block" />
        <Skeleton className="hidden h-8 w-24 sm:block" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden px-4 py-6 sm:px-6 max-md:px-2 max-md:py-3">
          <div className="mx-auto min-h-[600px] w-full max-w-[820px] rounded-md border border-border bg-card shadow-sm">
            <div className="flex h-12 items-center gap-2 border-b border-border px-3">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="hidden size-7 sm:block" />
              ))}
            </div>
            <div className="space-y-10 px-4 py-6 sm:px-10 sm:py-8">
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
        </div>
        <div className="hidden w-80 flex-shrink-0 flex-col border-l border-border bg-background p-4 lg:flex">
          <div className="flex-1" />
          <div className="mb-3 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </PageSkeleton>
  );
}
