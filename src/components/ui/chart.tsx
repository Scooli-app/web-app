"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/shared/utils/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
    theme?: Record<keyof typeof THEMES, string>;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used inside a <ChartContainer />");
  }

  return context;
}

function ChartStyle({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) {
  const entries = Object.entries(config).filter(
    ([, item]) => item.color || item.theme,
  );

  if (!entries.length) {
    return null;
  }

  const styles = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const declarations = entries
        .map(([key, item]) => {
          const color = item.theme?.[theme as keyof typeof THEMES] ?? item.color;
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean)
        .join("\n");

      return `${prefix} [data-chart="${id}"] {\n${declarations}\n}`;
    })
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId().replace(/:/g, "");
  const chartId = `chart-${id ?? uniqueId}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-pie-label-text]:fill-foreground [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-tooltip-label]:text-foreground",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: number | string;
};

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
  hideLabel?: boolean;
  labelFormatter?: (label: string | number) => React.ReactNode;
  valueFormatter?: (
    value: number | string | undefined,
    entry: ChartTooltipPayloadItem,
  ) => React.ReactNode;
};

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      className,
      hideLabel = false,
      labelFormatter,
      valueFormatter,
      ...props
    },
    ref,
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    const renderedLabel =
      hideLabel || label === undefined
        ? null
        : labelFormatter
          ? labelFormatter(label)
          : label;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[10rem] gap-1.5 rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs shadow-xl",
          className,
        )}
        {...props}
      >
        {renderedLabel ? (
          <div className="font-medium text-foreground">{renderedLabel}</div>
        ) : null}
        <div className="grid gap-1">
          {payload.map((entry, index) => {
            const key =
              typeof entry.dataKey === "string"
                ? entry.dataKey
                : typeof entry.name === "string"
                  ? entry.name
                  : "value";
            const itemConfig = config[key];
            const indicatorColor =
              entry.color ?? `var(--color-${key})` ?? "var(--primary)";

            return (
              <div
                key={`${key}-${index}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: indicatorColor }}
                  />
                  <span className="text-muted-foreground">
                    {itemConfig?.label ?? entry.name ?? key}
                  </span>
                </div>
                <span className="font-medium text-foreground">
                  {valueFormatter
                    ? valueFormatter(entry.value, entry)
                    : entry.value ?? "-"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
