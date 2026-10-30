/** Single card-shaped loading skeleton for a lesson slot. */
export function SlotSkeleton({ color }: { color?: string }) {
  return (
    <div
      className="animate-pulse rounded-md border border-border/60 min-h-[64px]"
      style={{ borderLeftWidth: "3px", borderLeftColor: color ?? "#d1d5db" }}
    >
      <div className="px-2 py-1.5 flex flex-col gap-1.5">
        <div className="flex items-start gap-1">
          <div className="mt-0.5 h-2 w-3 shrink-0 rounded bg-muted-foreground/15" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 w-4/5 rounded bg-muted-foreground/15" />
            <div className="h-2.5 w-3/5 rounded bg-muted-foreground/15" />
          </div>
        </div>
        <div
          className="h-2.5 w-3/5 rounded"
          style={{ background: color ? `${color}35` : "color-mix(in srgb, var(--muted-foreground) 15%, transparent)" }}
        />
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/10" />
          <div className="h-2 w-12 rounded bg-muted-foreground/10" />
          <div className="h-2 w-8 rounded bg-muted-foreground/10 ml-1" />
        </div>
      </div>
    </div>
  );
}
