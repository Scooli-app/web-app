import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils/utils";

export interface RankedBarItem {
  key: string;
  label: string;
  count: number;
  color?: string;
}

interface RankedBarsProps {
  items: RankedBarItem[];
  /** Total used to show each item's share (e.g. number of responses). */
  total?: number;
  /** Bar color when an item has none. */
  color?: string;
  /** Sort by count descending (use for unordered categories). */
  sortDesc?: boolean;
  /** Unit shown in the row tooltip, e.g. "respostas". */
  unit?: string;
  className?: string;
}

const percentFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 0,
});

/**
 * Horizontal ranked bars: full labels (wrapping, never truncated), the exact
 * value and share printed on every row, and a height that grows with the
 * number of options. Meant for categorical data that may have many options.
 */
export function RankedBars({
  items,
  total,
  color = "var(--chart-1)",
  sortDesc = false,
  unit = "respostas",
  className,
}: RankedBarsProps) {
  const rows = sortDesc ? [...items].sort((a, b) => b.count - a.count) : items;
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((row) => {
        const width = (row.count / max) * 100;
        const share =
          total && total > 0
            ? `${percentFormatter.format((row.count / total) * 100)}%`
            : null;
        return (
          <Tooltip key={row.key}>
            <TooltipTrigger asChild>
              <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center">
                <span className="text-sm leading-snug text-foreground sm:pr-1">
                  {row.label}
                </span>
                <span className="flex items-baseline justify-end gap-1.5 tabular-nums sm:order-3 sm:min-w-[5.5rem]">
                  <span className="text-sm font-semibold">{row.count}</span>
                  {share && (
                    <span className="text-xs text-muted-foreground">
                      {share}
                    </span>
                  )}
                </span>
                <div className="col-span-2 h-3 overflow-hidden rounded-full bg-muted sm:order-2 sm:col-span-1">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: row.count > 0 ? `${Math.max(width, 2)}%` : 0,
                      backgroundColor: row.color ?? color,
                    }}
                  />
                </div>
              </li>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="font-medium">{row.label}</span>
              {": "}
              {row.count} {unit}
              {share ? ` (${share})` : ""}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </ul>
  );
}
