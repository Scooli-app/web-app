import { cn } from "@/shared/utils/utils";
import type { ReactNode } from "react";

interface ResponsiveDataViewProps {
  mobileCardView: ReactNode;
  desktopTableView: ReactNode;
  className?: string;
}

export function ResponsiveDataView({
  mobileCardView,
  desktopTableView,
  className,
}: ResponsiveDataViewProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="md:hidden">{mobileCardView}</div>
      <div className="hidden md:block">{desktopTableView}</div>
    </div>
  );
}
