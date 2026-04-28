import { useCallback, useState } from "react";

interface UseUnsavedChangesOptions {
  onConfirmLeave?: () => void;
}

interface UseUnsavedChangesReturn {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  markAsDirty: () => void;
  markAsClean: () => void;
  showConfirmDialog: boolean;
  handleAttemptLeave: (callback: () => void) => void;
  handleConfirmLeave: () => void;
  handleCancelLeave: () => void;
}

export function useUnsavedChanges(
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesReturn {
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLeaveCallback, setPendingLeaveCallback] = useState<
    (() => void) | null
  >(null);

  const markAsDirty = useCallback(() => setIsDirty(true), []);
  const markAsClean = useCallback(() => setIsDirty(false), []);

  const handleAttemptLeave = useCallback(
    (callback: () => void) => {
      if (isDirty) {
        setPendingLeaveCallback(() => callback);
        setShowConfirmDialog(true);
      } else {
        callback();
      }
    },
    [isDirty]
  );

  const handleConfirmLeave = useCallback(() => {
    setShowConfirmDialog(false);
    setIsDirty(false);
    if (pendingLeaveCallback) {
      pendingLeaveCallback();
      setPendingLeaveCallback(null);
    }
    options.onConfirmLeave?.();
  }, [pendingLeaveCallback, options]);

  const handleCancelLeave = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingLeaveCallback(null);
  }, []);

  return {
    isDirty,
    setIsDirty,
    markAsDirty,
    markAsClean,
    showConfirmDialog,
    handleAttemptLeave,
    handleConfirmLeave,
    handleCancelLeave,
  };
}
