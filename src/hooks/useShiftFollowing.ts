"use client";

import { checkInService } from "@/services/api/check-in.service";
import type { ShiftFollowingResult } from "@/shared/types/check-in";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

/** What the teacher should hear about a shift: how many lessons moved, and which topics fell off the period. */
export function describeShift(result: ShiftFollowingResult): { count: number; overflow: string[] } {
  return { count: result.shifted, overflow: result.overflow.filter((topic) => topic.trim().length > 0) };
}

/**
 * "Mover as aulas seguintes?" after a lesson was not held (ENG-194). `offer` shows the question as a toast;
 * the teacher's answer moves the content and reports the result. `shift` moves without asking, for surfaces
 * that already asked (the calendar dialog can reuse either).
 */
export function useShiftFollowing() {
  const t = useTranslations("checkIns");

  const shift = useCallback(
    async (timetableId: string, slotId: string): Promise<ShiftFollowingResult | null> => {
      try {
        const result = await checkInService.shiftFollowing(timetableId, slotId);
        const { count, overflow } = describeShift(result);
        if (count > 0) toast.success(t("shiftedToast", { count }));
        if (overflow.length > 0) toast.warning(t("shiftOverflowToast", { topics: overflow.join(", ") }));
        if (count === 0 && overflow.length === 0) toast(t("shiftNothingToast"));
        return result;
      } catch {
        toast.error(t("shiftError"));
        return null;
      }
    },
    [t],
  );

  const offer = useCallback(
    (timetableId: string, slotId: string) => {
      toast(t("shiftQuestion"), {
        duration: 15000,
        action: { label: t("shiftAction"), onClick: () => void shift(timetableId, slotId) },
        cancel: { label: t("shiftKeep"), onClick: () => undefined },
      });
    },
    [shift, t],
  );

  return { offer, shift };
}
