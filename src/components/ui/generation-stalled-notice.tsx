import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GenerationStalledNoticeProps {
  title: string;
  description: string;
  actionLabel: string;
  onRefresh: () => void;
}

/**
 * Replaces an indefinite generation spinner once a document has been
 * "generating" for longer than the stall threshold.
 */
export function GenerationStalledNotice({
  title,
  description,
  actionLabel,
  onRefresh,
}: GenerationStalledNoticeProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-4 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden />
      <div>
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        {actionLabel}
      </Button>
    </div>
  );
}
