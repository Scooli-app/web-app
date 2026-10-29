"use client";

import type { RootState } from "@/store/store";
import { useSelector } from "react-redux";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSelector((state: RootState) => state.ui.theme);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // An open dialog sets pointer-events: none on <body>; without this its toasts' buttons can't be clicked.
      className="toaster group pointer-events-auto"
      closeButton
      toastOptions={{
        style: {
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          border: "1px solid var(--primary)",
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-lexend",
          description: "group-[.toast]:text-primary-foreground/80",
          actionButton:
            "group-[.toast]:bg-background group-[.toast]:text-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

/**
 * For a dialog's or sheet's onInteractOutside: a click on a toast (its action, its close button) is not a click
 * outside, so the dialog stays open and the toast's action runs.
 */
function keepOpenOnToastClick(event: { target: EventTarget | null; preventDefault: () => void }) {
  if (event.target instanceof Element && event.target.closest("[data-sonner-toaster]")) event.preventDefault();
}

export { keepOpenOnToastClick, Toaster };

