"use client";

import { useDateFnsLocale } from "@/i18n/dateFns";
import { CalendarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
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
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value
            ? format.dateTime(value, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : (placeholder ?? t("selectDate"))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          defaultMonth={value}
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
