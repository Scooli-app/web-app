import { Skeleton } from "@/components/ui/skeleton";
import { SlotSkeleton } from "@/components/calendar/SlotSkeleton";
import { toIso } from "@/shared/utils/calendar";

/** School days get the width; the (usually empty) weekend gets two narrow columns. */
export const NARROW_WEEKEND_COLUMNS = "repeat(5, minmax(0, 1fr)) repeat(2, minmax(0, 0.35fr))";
export const EVEN_WEEK_COLUMNS = "repeat(7, minmax(0, 1fr))";

/**
 * Full week-grid skeleton shown while timetables are still loading.
 * Uses the real week-day dates so it looks contextual, not generic.
 */
export function CalendarGridSkeleton({
  weekDays,
  today,
  dayLabels,
}: {
  weekDays: Date[];
  today: string;
  dayLabels: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border w-full">
      <div className="min-w-[640px] w-full">
        {/* Real day headers */}
        <div
          className="grid divide-x divide-border border-b bg-muted/20"
          style={{ gridTemplateColumns: NARROW_WEEKEND_COLUMNS }}
        >
          {weekDays.map((day, i) => {
            const iso = toIso(day);
            const isToday = iso === today;
            return (
              <div
                key={iso}
                className={`px-2 py-2 text-center ${isToday ? "bg-primary/5" : ""}`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {i >= 5 ? dayLabels[i].slice(0, 3) : dayLabels[i]}
                </p>
                <div className="mt-0.5 flex justify-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center text-sm font-bold leading-none ${
                      isToday
                        ? "rounded-full bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Skeleton slot cells — only weekdays (index 0–4) get cards */}
        <div className="grid divide-x divide-border" style={{ gridTemplateColumns: NARROW_WEEKEND_COLUMNS }}>
          {weekDays.map((day, i) => (
            <div key={toIso(day)} className="min-h-[180px] p-2 space-y-1.5">
              {i < 5 && (
                <>
                  <SlotSkeleton />
                  {i % 3 !== 1 && <SlotSkeleton />}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The month grid on first load, before any lesson data has arrived. */
export function MonthGridSkeleton({ dayLabels }: { dayLabels: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 divide-x divide-border border-b bg-muted/20">
        {dayLabels.map((d) => (
          <div key={d} className="py-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }, (_, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-7 divide-x divide-border border-b last:border-b-0">
          {Array.from({ length: 7 }, (_, colIdx) => (
            <div key={colIdx} className="min-h-[100px] animate-pulse p-2">
              <div className="mb-2 h-5 w-5 rounded-full bg-muted-foreground/15" />
              {colIdx < 5 && rowIdx < 3 && (
                <div className="space-y-1">
                  <div className="flex gap-0.5">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/10" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/10" />
                  </div>
                  <div className="h-2.5 w-12 rounded bg-muted-foreground/10" />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The sticky calendar top bar: title, view toggle, navigation, class links, and (week view) the class chips. */
export function CalendarHeaderSkeleton({ chips = false }: { chips?: boolean }) {
  return (
    <div className="sticky top-0 z-10 border-b bg-card/95 px-4 pb-2 pt-2.5">
      <div className="mx-auto max-w-[1400px] space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="mr-2 h-7 w-24" />
          <Skeleton className="h-[26px] w-[122px] rounded-lg" />
          <Skeleton className="h-8 w-[58px]" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="h-5 w-32" />
          <div className="flex-1" />
          <Skeleton className="hidden h-8 w-[98px] md:block" />
          <Skeleton className="hidden h-8 w-[131px] md:block" />
        </div>
        {chips && (
          <div className="flex min-h-[28px] items-center gap-1.5">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
