import { cn } from "@/shared/utils/utils";
import type { ReactNode } from "react";

type ContainerSize = "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";

const SIZE_CLASSES: Record<ContainerSize, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-[1400px]",
  "7xl": "max-w-7xl",
  full: "max-w-none",
};

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  size?: ContainerSize;
  withGutters?: boolean;
}

export function PageContainer({
  children,
  className,
  contentClassName,
  size = "7xl",
  withGutters = true,
}: PageContainerProps) {
  return (
    <section className={cn("w-full", className)}>
      <div
        className={cn(
          "mx-auto w-full",
          SIZE_CLASSES[size],
          withGutters && "px-3 sm:px-4 md:px-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
