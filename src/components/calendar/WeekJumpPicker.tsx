"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDateFnsLocale } from "@/i18n/dateFns";
import { addDays, getWeekStart } from "@/shared/utils/calendar";
import { cn } from "@/shared/utils/utils";

interface WeekJumpPickerProps {
  weekStart: Date;
  onJump: (weekStart: Date) => void;
  className?: string;
  /** The visible week label. */
  children: ReactNode;
}

/** The week label as a button: it opens a calendar with month and year dropdowns to jump to any week. */
export function WeekJumpPicker({ weekStart, onJump, className, children }: WeekJumpPickerProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("calendar");
  const dateFnsLocale = useDateFnsLocale();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          {children}
          <span className="sr-only">{t("shared.jumpToWeek")}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          weekStartsOn={1}
          defaultMonth={weekStart}
          onSelect={(date) => {
            if (date) onJump(getWeekStart(date));
            setOpen(false);
          }}
          modifiers={{ shownWeek: { from: weekStart, to: addDays(weekStart, 6) } }}
          modifiersClassNames={{ shownWeek: "bg-primary/10" }}
          locale={dateFnsLocale}
        />
      </PopoverContent>
    </Popover>
  );
}
