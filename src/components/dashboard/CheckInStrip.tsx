"use client";

import { CheckInCard } from "@/components/check-in/CheckInCard";
import { Button } from "@/components/ui/button";
import { confirmableCount, shouldShowCheckInStrip } from "@/hooks/checkInQueue";
import { usePendingCheckIns } from "@/hooks/usePendingCheckIns";
import type { CheckInSubmission, PendingCheckIn } from "@/shared/types/check-in";
import { Routes } from "@/shared/types/routes";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * "Como correu a aula?": the past lessons still waiting for a check-in, one card at a time,
 * at the top of the week card. Hidden unless the `class_state_enabled` flag is on and something
 * is pending. Never a modal.
 */
export function CheckInStrip() {
  const t = useTranslations("checkIns");
  const locale = useLocale();
  const router = useRouter();
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const { visible, dismissed, submit, confirmAll, skipForSession, dismiss } = usePendingCheckIns(enabled);

  if (!shouldShowCheckInStrip({ enabled, dismissed, visibleCount: visible.length })) return null;

  const current = visible[0];

  const handleSubmit = async (item: PendingCheckIn, body: CheckInSubmission) => {
    const saved = await submit(item, body);
    if (!saved) {
      toast.error(t("saveError"));
      return;
    }
    if (body.result === "TAUGHT") {
      toast.success(t("taughtToast"), {
        action: {
          label: t("prepareNext"),
          onClick: () => router.push(`${Routes.CALENDAR}/${item.timetableId}`),
        },
      });
    }
  };

  const handleConfirmAll = async () => {
    const updated = await confirmAll();
    if (updated === null) {
      toast.error(t("confirmAllError"));
    } else {
      toast.success(t("confirmAllToast", { count: updated }));
    }
  };

  return (
    <section aria-label={t("title")} className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          {t("pendingCount", { count: visible.length })}
        </span>
        <div className="flex items-center gap-1">
          {confirmableCount(visible) >= 2 && (
            <Button variant="link" size="sm" className="h-auto p-1 text-xs" onClick={() => void handleConfirmAll()}>
              {t("confirmAll")}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t("dismiss")} onClick={dismiss}>
            <X className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
      {/* TODO(ENG-194): "Não houve aula" should also offer to move the following slots; not built here. */}
      <CheckInCard
        key={current.slotId}
        item={current}
        locale={locale}
        onSubmit={(body) => void handleSubmit(current, body)}
        onSkip={() => skipForSession(current)}
      />
    </section>
  );
}
