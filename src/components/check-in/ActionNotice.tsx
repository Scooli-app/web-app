"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export interface NoticeAction {
  label: string;
  onClick: () => void;
  /** The confirming action is filled; the one that declines is outlined. */
  primary?: boolean;
  busy?: boolean;
}

/**
 * The one next step of a check-in, where the teacher is looking, in the app's colours: one line with a short message
 * and at most a confirm and a decline button. Never in a toast. `waiting` shows a spinner instead of buttons.
 */
export function ActionNotice({
  message,
  hint,
  actions = [],
  waiting = false,
  className,
}: {
  message: ReactNode;
  hint?: ReactNode;
  actions?: NoticeAction[];
  waiting?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm text-foreground">
          {waiting && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />}
          <span>{message}</span>
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.primary ? "default" : "outline"}
              className="h-8"
              disabled={action.busy}
              onClick={action.onClick}
            >
              {action.busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
