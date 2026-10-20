import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Same shell as DocumentCard: type icon + badge, meta line, title, preview, footer. */
export function DocumentCardSkeleton() {
  return (
    <Card className="flex h-full w-full flex-col gap-0 border border-border p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="size-6" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-4 w-36" />
      <Skeleton className="mb-1.5 h-5 w-full" />
      <Skeleton className="mb-4 h-5 w-2/3" />
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3.5 w-5" />
      </div>
    </Card>
  );
}

/** The documents grid, `count` cards long. */
export function DocumentGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        // A single row, like the grouped view: the fourth card waits for the four-column grid.
        <div key={i} className={count === 4 && i === 3 ? "lg:hidden xl:block" : undefined}>
          <DocumentCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Class sections (title row + one row of cards), as DocumentsByClass shows them. */
export function DocumentSectionsSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="space-y-8" aria-hidden>
      {Array.from({ length: sections }, (_, i) => (
        <section key={i}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-5 w-20" />
          </div>
          <DocumentGridSkeleton />
        </section>
      ))}
    </div>
  );
}
