"use client";

import { CalendarGridSkeleton, CalendarHeaderSkeleton } from "@/components/calendar/CalendarGridSkeleton";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { defaultLocale, isSupportedLocale } from "@/i18n/locales";
import { addDays, defaultCalendarWeek, getDayLabels, toIso } from "@/shared/utils/calendar";
import { useLocale } from "next-intl";

/** The week view's top bar and grid, on the week the page opens on. */
export default function CalendarLoading() {
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const weekStart = defaultCalendarWeek();
  return (
    <PageSkeleton className="flex flex-col">
      <CalendarHeaderSkeleton chips />
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-4 md:pb-8">
        <CalendarGridSkeleton
          weekDays={Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))}
          today={toIso(new Date())}
          dayLabels={getDayLabels(locale)}
        />
      </div>
    </PageSkeleton>
  );
}
