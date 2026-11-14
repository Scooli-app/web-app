"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export interface NoticeAction {
  label: string;
  onClick: () => void;
  /** The main action is filled; the others are outlined. */
  primary?: boolean;
  busy?: boolean;
}

/**
 * A next step shown where the teacher is looking, in the app's colours: a short message, an optional hint that says
 * what the action does, and its buttons. Important actions live here, never in a toast.
 */
export function ActionNotice({
  message,
  hint,
  actions = [],
  className,
}: {
  message: ReactNode;
  hint?: ReactNode;
  actions?: NoticeAction[];
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn("space-y-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2", className)}
    >
      <div className="space-y-0.5">
        <p className="text-sm text-foreground">{message}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
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
