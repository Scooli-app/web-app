"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Two empty A4 pages, while the first questions of a generated document are being written. */
export function PagesSkeleton() {
  return (
    <>
      {[0, 1].map((page) => (
        <div key={page} className="rounded-md border border-neutral-200 bg-white px-6 pb-14 pt-8 md:px-12 shadow-[0_2px_10px_rgba(0,0,0,0.06)]" style={{ aspectRatio: "210 / 297" }}>
          {page === 0 && <Skeleton className="mb-6 h-20 w-full rounded bg-neutral-200" />}
          {[0, 1].map((group) => (
            <div key={group} className="mb-8">
              <div className="mb-4 flex justify-between border-b-2 border-neutral-200 pb-1">
                <Skeleton className="h-4 w-20 bg-neutral-200" />
                <Skeleton className="h-4 w-12 bg-neutral-200" />
              </div>
              {[0, 1, 2].map((row) => (
                <div key={row} className="mb-5 flex gap-3">
                  <Skeleton className="h-4 w-4 shrink-0 bg-neutral-200" />
                  <div className="flex flex-1 flex-col gap-2" style={{ animationDelay: `${row * 150}ms` }}>
                    <Skeleton className="h-4 w-11/12 bg-neutral-200" />
                    <Skeleton className="h-4 w-2/3 bg-neutral-200" />
                    {row !== 1 && <Skeleton className="h-3 w-1/3 bg-neutral-100" />}
                  </div>
                  <Skeleton className="h-5 w-12 shrink-0 bg-neutral-200" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
