"use client";

import { useDateFnsLocale } from "@/i18n/dateFns";
import { CalendarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/utils/utils";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  fromDate,
  toDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("common");
  const format = useFormatter();
  // react-day-picker still needs a date-fns locale for its own month and
  // weekday names; the trigger label goes through Intl.
  const dateFnsLocale = useDateFnsLocale();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Styled as a form field (same look as SelectTrigger), not as a button. */}
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-left text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {value
              ? // The value is a calendar day at local midnight. The formatter runs in the app's
                // time zone (UTC when none is configured), where that instant can fall on the day
                // before, so format the same day as a UTC date.
                format.dateTime(
                  new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())),
                  { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
                )
              : (placeholder ?? t("selectDate"))}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required
          captionLayout="dropdown"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          defaultMonth={value ?? fromDate}
          startMonth={fromDate}
          endMonth={toDate}
          disabled={[
            ...(fromDate ? [{ before: fromDate }] : []),
            ...(toDate ? [{ after: toDate }] : []),
          ]}
          locale={dateFnsLocale}
        />
      </PopoverContent>
    </Popover>
  );
}
