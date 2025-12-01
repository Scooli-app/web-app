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

export interface ConfirmationDialogProps {
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
  title = "Tem a certeza?",
  description = "Esta ação não pode ser desfeita.",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "warning",
}: ConfirmationDialogProps) {
  const iconColors = {
    warning: "bg-amber-100 text-amber-600",
    danger: "bg-red-100 text-red-600",
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
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none h-10 border-[#C7C9D9] text-[#2E2F38] hover:bg-[#F4F5F8] rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={`flex-1 sm:flex-none h-10 rounded-xl ${confirmColors[variant]}`}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UnsavedChangesDialog({
  isOpen,
  onClose,
  onConfirm,
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Alterações não guardadas"
      description="Tem alterações que ainda não foram guardadas. Tem a certeza que pretende sair? As alterações serão perdidas."
      confirmLabel="Sair sem guardar"
      cancelLabel="Continuar a editar"
      variant="warning"
    />
  );
}

