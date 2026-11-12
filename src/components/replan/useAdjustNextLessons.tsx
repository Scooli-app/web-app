"use client";

import { ReplanRequestDialog } from "@/components/replan/ReplanRequestDialog";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectHasEffectivePro } from "@/store/entitlements/selectors";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useCallback, useState, type ReactNode } from "react";

interface Target {
  timetableId: string;
  slotId: string;
}

/**
 * "Ajustar próximas aulas" after feedback on a past lesson: asks the replanning agent for the lessons after it, with
 * an optional note (the request dialog). Pro only: a locked account gets its read-only paywall, any other account
 * without Pro the upgrade. Render `dialog` once where
 * the caller lives; `adjust` opens it for a lesson.
 */
export function useAdjustNextLessons(
  callbacks: { onStarted?: () => void; onSettled?: () => void } = {},
): {
  adjust: (timetableId: string, slotId: string) => void;
  dialog: ReactNode;
} {
  const isPro = useAppSelector(selectHasEffectivePro);
  const dispatch = useAppDispatch();
  const { guard } = useAccountAccess();
  const [target, setTarget] = useState<Target | null>(null);

  const adjust = useCallback(
    (timetableId: string, slotId: string) => {
      // A read-only account (trial over) sees its own paywall; any other account without Pro, the upgrade.
      if (!guard("generate")) return;
      if (!isPro) {
        dispatch(setUpgradeModalOpen(true));
        return;
      }
      setTarget({ timetableId, slotId });
    },
    [dispatch, guard, isPro],
  );

  const dialog = target ? (
    <ReplanRequestDialog
      timetableId={target.timetableId}
      triggerSlotId={target.slotId}
      open
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
      onStarted={callbacks.onStarted}
      onSettled={callbacks.onSettled}
    />
  ) : null;

  return { adjust, dialog };
}
