"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker, useDayPicker, type CalendarMonth } from "react-day-picker";

import { cn } from "@/shared/utils/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Without an explicit endMonth, react-day-picker stops the year dropdown at the current year.
const DROPDOWN_YEARS = 5;

function CalendarCaption({
  children,
}: {
  calendarMonth: CalendarMonth;
  displayIndex: number;
  children?: React.ReactNode;
}) {
  const { goToMonth, nextMonth, previousMonth } = useDayPicker();

  return (
    <div className="flex items-center justify-between px-1 pb-1">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-transparent opacity-60 transition-opacity hover:bg-accent hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {children}

      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-transparent opacity-60 transition-opacity hover:bg-accent hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  startMonth,
  endMonth,
  ...props
}: CalendarProps) {
  const hasDropdowns = captionLayout !== "label";
  const thisYear = new Date().getFullYear();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth ?? (hasDropdowns ? new Date(thisYear - DROPDOWN_YEARS, 0) : undefined)}
      endMonth={endMonth ?? (hasDropdowns ? new Date(thisYear + DROPDOWN_YEARS, 11) : undefined)}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-2",
        month_caption: "",
        caption_label: hasDropdowns
          ? "pointer-events-none inline-flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm font-medium [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-muted-foreground"
          : "text-sm font-medium",
        dropdowns: "flex items-center gap-1.5",
        dropdown_root:
          "relative rounded-md border border-input has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 hover:bg-accent",
        dropdown: "absolute inset-0 w-full cursor-pointer bg-popover opacity-0",
        nav: "hidden",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "flex h-9 w-9 items-center justify-center text-[0.8rem] font-normal text-muted-foreground",
        week: "flex w-full",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button:
          "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today:
          "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-semibold",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-50",
        disabled: "[&>button]:text-muted-foreground [&>button]:opacity-30",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        MonthCaption: CalendarCaption,
        Chevron: ({ orientation, className }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : orientation === "down" ? (
            <ChevronDown className={className} />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
