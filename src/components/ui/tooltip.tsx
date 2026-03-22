"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/shared/utils/utils";

type TooltipMobileContextValue = {
  isMobile: boolean;
  openMobileSheet: () => void;
  setMobileContent: (content: React.ReactNode) => void;
  setMobileHidden: (hidden: boolean) => void;
  clearMobileContent: () => void;
};

const TooltipMobileContext = React.createContext<TooltipMobileContextValue | null>(
  null
);
type TooltipTriggerClickEvent = Parameters<
  NonNullable<React.ComponentProps<typeof TooltipPrimitive.Trigger>["onClick"]>
>[0];

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const isMobile = useIsMobile();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);
  const [mobileContent, setMobileContent] = React.useState<React.ReactNode>(null);
  const [isMobileContentHidden, setIsMobileContentHidden] = React.useState(false);

  const openMobileSheet = React.useCallback(() => {
    if (!isMobile || isMobileContentHidden || mobileContent === null) {
      return;
    }
    setIsMobileSheetOpen(true);
  }, [isMobile, isMobileContentHidden, mobileContent]);

  const clearMobileContent = React.useCallback(() => {
    setMobileContent(null);
    setIsMobileContentHidden(false);
    setIsMobileSheetOpen(false);
  }, []);

  React.useEffect(() => {
    if (isMobileContentHidden) {
      setIsMobileSheetOpen(false);
    }
  }, [isMobileContentHidden]);

  const mobileContextValue = React.useMemo<TooltipMobileContextValue>(
    () => ({
      isMobile,
      openMobileSheet,
      setMobileContent,
      setMobileHidden: setIsMobileContentHidden,
      clearMobileContent,
    }),
    [isMobile, openMobileSheet, clearMobileContent]
  );

  return (
    <TooltipProvider>
      <TooltipMobileContext.Provider value={mobileContextValue}>
        <TooltipPrimitive.Root data-slot="tooltip" {...props}>
          {children}
        </TooltipPrimitive.Root>
        {isMobile && mobileContent !== null && !isMobileContentHidden && (
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetContent
              side="bottom"
              className="gap-0 rounded-t-2xl border-t border-border px-0 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Informacao</SheetTitle>
                <SheetDescription>
                  Informacao adicional da interface.
                </SheetDescription>
              </SheetHeader>
              <div
                aria-hidden
                className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted"
              />
              <div className="max-h-[45dvh] overflow-y-auto px-5 text-sm text-foreground">
                {mobileContent}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </TooltipMobileContext.Provider>
    </TooltipProvider>
  );
}

function TooltipTrigger({
  onClick,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const mobileContext = React.useContext(TooltipMobileContext);

  const handleClick = React.useCallback(
    (event: TooltipTriggerClickEvent) => {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      mobileContext?.openMobileSheet();
    },
    [onClick, mobileContext]
  );

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onClick={handleClick}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  hidden,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const mobileContext = React.useContext(TooltipMobileContext);

  React.useEffect(() => {
    if (!mobileContext?.isMobile) {
      return;
    }

    mobileContext.setMobileContent(children);
    mobileContext.setMobileHidden(Boolean(hidden));
  }, [mobileContext, children, hidden]);

  React.useEffect(() => {
    if (!mobileContext?.isMobile) {
      return;
    }

    return () => {
      mobileContext.clearMobileContent();
    };
  }, [mobileContext]);

  if (mobileContext?.isMobile) {
    return null;
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        hidden={hidden}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

