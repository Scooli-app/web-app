"use client";

import { CalendarHeaderSkeleton, MonthGridSkeleton } from "@/components/calendar/CalendarGridSkeleton";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { defaultLocale, isSupportedLocale } from "@/i18n/locales";
import { getDayLabels } from "@/shared/utils/calendar";
import { useLocale } from "next-intl";

/** The month view's top bar and grid. */
export default function CalendarMonthLoading() {
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  return (
    <PageSkeleton className="flex flex-col">
      <CalendarHeaderSkeleton />
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-4">
        <MonthGridSkeleton dayLabels={getDayLabels(locale)} />
      </div>
    </PageSkeleton>
  );
}
