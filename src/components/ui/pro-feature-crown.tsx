"use client";

import { Routes } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface ProFeatureCrownProps {
  className?: string;
  tooltipText?: string;
}

export function ProFeatureCrown({
  className,
  tooltipText = "Funcionalidade disponível apenas para utilizadores Pro.",
}: ProFeatureCrownProps) {
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(Routes.CHECKOUT);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Funcionalidade Pro"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-sm text-warning transition-colors hover:text-warning/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Crown className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}

export default ProFeatureCrown;
