import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/utils";
import { Check, Clock, Pencil, X } from "lucide-react";
import { useRef, useState } from "react";
import { LESSON_TIMES } from "../constants";
import type { FormUpdateFn } from "../types";

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
    <Card className="p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Duração da Aula{" "}
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              (Opcional)
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {LESSON_TIMES.map((time) => (
            <button
              key={time.id}
              type="button"
              onClick={() => handlePresets(time.value)}
              className={cn(
                "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all",
                "border hover:scale-[1.02] active:scale-[0.98]",
                lessonTime === time.value
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card text-foreground border-border hover:border-primary hover:bg-accent"
              )}
              aria-pressed={lessonTime === time.value}
              aria-label={`Selecionar ${time.label}`}
            >
              <span>⏱️</span>
              <span>{time.label}</span>
            </button>
          ))}

          {hasCustomTimeSelected ? (
            <button
              type="button"
              onClick={handleCustomTimeClick}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] group"
              aria-label={`Duração: ${customTime} min`}
            >
              <span>⏱️</span>
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
                  className="h-9 w-16 sm:w-20 px-2 sm:px-3 py-2 text-sm bg-muted border-primary rounded-xl placeholder:text-muted-foreground"
                  aria-label="Duração personalizada"
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
                aria-label="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
              {customTime && (
                <button
                  type="button"
                  onClick={handleConfirmCustomTime}
                  className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                  aria-label="Confirmar"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
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
                "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all",
                "border hover:scale-[1.02] active:scale-[0.98]",
                "bg-card text-foreground border-border hover:border-primary hover:bg-accent"
              )}
              aria-label="Selecionar outra duração"
            >
              <span>⏱️</span>
              <span>Outro</span>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
