import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/utils";
import { Check, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { LESSON_TIMES } from "../constants";
import type { FormUpdateFn } from "../types";
import { OptionRow } from "./FormCard";

interface DurationSectionProps {
  lessonTime?: number;
  customTime?: number;
  onUpdate: FormUpdateFn;
  className?: string;
}

export function DurationSection({
  lessonTime,
  customTime,
  onUpdate,
  className,
}: DurationSectionProps) {
  const t = useTranslations("documentCreation.duration");
  const [isEditingCustomTime, setIsEditingCustomTime] = useState(false);
  const customTimeInputRef = useRef<HTMLInputElement>(null);

  const handleCustomTimeClick = () => {
    setIsEditingCustomTime(true);
    setTimeout(() => customTimeInputRef.current?.focus(), 0);
  };

  const handlePresets = (value: number) => {
    if (lessonTime === value) {
      // Toggle off
      onUpdate("lessonTime", undefined);
    } else {
      // Select preset and clear custom
      onUpdate("lessonTime", value);
      onUpdate("customTime", undefined);
    }
  };

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    onUpdate("customTime", value);
    onUpdate("lessonTime", value);
  };

  const handleCancelCustomTime = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent blur from firing if clicking cancel
    onUpdate("lessonTime", undefined);
    onUpdate("customTime", undefined);
    setIsEditingCustomTime(false);
  };

  const handleConfirmCustomTime = (e?: React.MouseEvent | React.FocusEvent) => {
    e?.stopPropagation();
    setIsEditingCustomTime(false);
    // lessonTime is already updated via onChange
  };

  const isPreset = LESSON_TIMES.some((t) => t.value === lessonTime);
  // Custom is selected if we have a lessonTime that is NOT a preset, and we are not currently editing
  const hasCustomTimeSelected = lessonTime && !isPreset && !isEditingCustomTime;

  return (
    <OptionRow label={t("title")}>
        <div className={cn("flex flex-wrap gap-1.5", className)}>
          {LESSON_TIMES.map((time) => (
            <button
              key={time.id}
              type="button"
              onClick={() => handlePresets(time.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                lessonTime === time.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary hover:bg-accent"
              )}
              aria-pressed={lessonTime === time.value}
              aria-label={t("selectAriaLabel", { label: time.label })}
            >
              <span>{time.label}</span>
            </button>
          ))}

          {hasCustomTimeSelected ? (
            <button
              type="button"
              onClick={handleCustomTimeClick}
              className="group inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              aria-label={t("currentAriaLabel", { minutes: lessonTime })}
            >
              <span>{lessonTime} min</span>
              <Pencil className="w-3 h-3 ml-1 opacity-70 group-hover:opacity-100 shrink-0" />
            </button>
          ) : isEditingCustomTime ? (
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="relative flex items-center">
                <Input
                  ref={customTimeInputRef}
                  type="number"
                  value={customTime || ""}
                  onChange={handleCustomTimeChange}
                  onBlur={handleConfirmCustomTime}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmCustomTime();
                    } else if (e.key === "Escape") {
                      handleCancelCustomTime();
                    }
                  }}
                  placeholder="75"
                  className="h-8 w-16 rounded-lg border-primary bg-muted px-2 text-sm placeholder:text-muted-foreground"
                  aria-label={t("customAriaLabel")}
                  autoFocus
                />
                <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm text-muted-foreground">
                  min
                </span>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing before click
                onClick={handleCancelCustomTime}
                className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={t("cancelAriaLabel")}
              >
                <X className="w-4 h-4" />
              </button>
              {/* Confirm button is always available when editing, even if customTime is 0 */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                onClick={handleConfirmCustomTime}
                className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                aria-label={t("confirmAriaLabel")}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onUpdate("lessonTime", 0); // Temporary clear to show input
                onUpdate("customTime", undefined);
                handleCustomTimeClick();
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                "bg-card text-foreground border-border hover:border-primary hover:bg-accent"
              )}
              aria-label={t("otherAriaLabel")}
            >
              <span>{t("other")}</span>
            </button>
          )}
        </div>
    </OptionRow>
  );
}
