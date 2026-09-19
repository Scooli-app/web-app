"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "warning" | "danger";
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "warning",
}: ConfirmationDialogProps) {
  const t = useTranslations("common.confirmationDialog");
  const resolvedTitle = title ?? t("defaultTitle");
  const resolvedDescription = description ?? t("defaultDescription");
  const resolvedConfirmLabel = confirmLabel ?? t("confirm");
  const resolvedCancelLabel = cancelLabel ?? t("cancel");

  const iconColors = {
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    danger: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
  };

  const confirmColors = {
    warning:
      "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20",
    danger:
      "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${iconColors[variant]}`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle>{resolvedTitle}</DialogTitle>
              <DialogDescription className="mt-1">
                {resolvedDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none h-10 border-border text-secondary-foreground hover:bg-muted rounded-xl"
          >
            {resolvedCancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={`flex-1 sm:flex-none h-10 rounded-xl ${confirmColors[variant]}`}
          >
            {resolvedConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UnsavedChangesDialog({
  isOpen,
  onClose,
  onConfirm,
}: UnsavedChangesDialogProps) {
  const t = useTranslations("common.unsavedChangesDialog");
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("title")}
      description={t("description")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="warning"
    />
  );
}
