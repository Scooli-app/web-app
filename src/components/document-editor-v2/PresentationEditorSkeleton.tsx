import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors BlockDocumentEditor: toolbar, slide-format bar, slide rail | canvas + notes | AI panel. */
export function PresentationEditorSkeleton() {
  return (
    <PageSkeleton className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-background px-3 py-2">
        <div className="mr-2 space-y-1">
          <Skeleton className="h-4 w-64 max-w-[40vw]" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
        {["w-[81px]", "w-[104px]", "w-[118px]", "w-[101px]", "w-[89px]"].map((w, i) => (
          <Skeleton key={i} className={`hidden h-8 md:block ${w}`} />
        ))}
        <div className="flex-1" />
        <Skeleton className="h-8 w-[123px]" />
        <Skeleton className="h-8 w-[124px]" />
      </div>
      <div className="flex h-11 flex-shrink-0 items-center gap-2 border-b border-border px-3">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-7 w-9" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-44 flex-shrink-0 flex-col gap-3 overflow-hidden border-r border-border bg-muted/20 p-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-video w-full shrink-0" />
          ))}
        </aside>
        <main className="flex min-h-0 flex-1 flex-col bg-neutral-100 dark:bg-zinc-900">
          <div className="flex flex-1 items-center justify-center p-4 pt-9">
            <Skeleton className="aspect-video w-full max-w-[816px] rounded-lg" />
          </div>
          <div className="h-[154px] space-y-3 border-t border-border bg-background px-4 py-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-[100px] w-full rounded-lg" />
          </div>
        </main>
        <aside className="hidden w-80 flex-shrink-0 flex-col border-l border-border bg-background lg:flex">
          <div className="m-0 flex h-[708px] flex-col justify-end gap-3 rounded-xl border border-border p-6">
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="mx-auto h-3 w-48" />
          </div>
        </aside>
      </div>
    </PageSkeleton>
  );
}
