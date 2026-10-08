import { cn } from "@/shared/utils/utils";
import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChoiceChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  selected: boolean;
  /** Tints an unselected chip — used for choices saved in the teacher's profile. */
  highlighted?: boolean;
  /** Shows a check mark when selected, so selection never relies on colour alone. */
  showCheck?: boolean;
  trailing?: ReactNode;
}

/** Pill-shaped toggle used for years, subjects and UCs across creation and settings. */
export function ChoiceChip({
  selected,
  highlighted = false,
  showCheck = false,
  trailing,
  className,
  children,
  ...props
}: ChoiceChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-xs font-medium transition-colors sm:min-h-9 sm:px-3 sm:text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : highlighted
            ? "border-primary/40 bg-primary/10 text-primary hover:border-primary hover:bg-primary/15"
            : "border-border bg-card text-foreground hover:border-primary hover:bg-accent",
        className
      )}
      {...props}
    >
      {showCheck && selected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span className="min-w-0">{children}</span>
      {trailing}
    </button>
  );
}
