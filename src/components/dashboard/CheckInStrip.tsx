"use client";

import { translateSubject } from "@/components/document-creation/constants";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { buildSubmission, isAssessmentCheckIn, needsOutcomeStep, shouldShowCheckInStrip } from "@/hooks/checkInQueue";
import { usePendingCheckIns } from "@/hooks/usePendingCheckIns";
import type { CheckInResult, CheckInSubmission, PendingCheckIn } from "@/shared/types/check-in";
import { Routes } from "@/shared/types/routes";
import { toIso } from "@/shared/utils/calendar";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { relativeDayLabel } from "./checkInDay";

type OutcomeResult = Extract<CheckInResult, "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL">;

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
          {visible.length >= 2 && (
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

interface CheckInCardProps {
  item: PendingCheckIn;
  locale: string;
  onSubmit: (body: CheckInSubmission) => void;
  onSkip: () => void;
}

function CheckInCard({ item, locale, onSubmit, onSkip }: CheckInCardProps) {
  const t = useTranslations("checkIns");
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const todayIso = toIso(new Date());
  const day = relativeDayLabel(item.slotDate, todayIso, locale, {
    today: t("dayToday"),
    yesterday: t("dayYesterday"),
    daysAgo: (count) => t("daysAgo", { count }),
  });
  const subject = translateSubject(item.subject);
  const meta = item.topicTitle
    ? t("meta", { turma: item.turmaTitle, subject, topic: item.topicTitle, day })
    : t("metaNoTopic", { turma: item.turmaTitle, subject, day });

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const choose = (result: CheckInResult) => {
    if (needsOutcomeStep(result, item)) {
      setSelected([]);
      setOutcomeResult(result as OutcomeResult);
      return;
    }
    onSubmit(buildSubmission(result));
  };

  const header = (
    <div className="min-w-0">
      <h3 className="text-base font-semibold leading-snug text-foreground">
        {isAssessmentCheckIn(item) ? t("assessmentQuestion") : t("title")}
      </h3>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta}</p>
    </div>
  );

  if (isAssessmentCheckIn(item)) {
    return (
      <div className="space-y-3">
        {header}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSubmit({ result: "TAUGHT" })}>
            {t("assessmentYes")}
          </Button>
          <Button size="sm" variant="outline" onClick={onSkip}>
            {t("assessmentNotYet")}
          </Button>
        </div>
      </div>
    );
  }

  if (outcomeResult) {
    const question = outcomeResult === "PARTIAL" ? t("uncoveredQuestion") : t("difficultiesQuestion");
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm font-medium text-foreground">{question}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={question}>
          {item.outcomes.map((outcome) => (
            <ChoiceChip
              key={outcome.id}
              selected={selected.includes(outcome.id)}
              showCheck
              title={outcome.topicPath.join(" › ")}
              onClick={() => toggle(outcome.id)}
            >
              {outcome.text}
            </ChoiceChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => onSubmit(buildSubmission(outcomeResult, selected))}>
            {t("confirm")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSubmit(buildSubmission(outcomeResult))}>
            {t("skip")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOutcomeResult(null)}>
            {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  const options: { result: CheckInResult; label: string; glyph: string }[] = [
    { result: "TAUGHT", label: t("resultTaught"), glyph: "✓" },
    { result: "TAUGHT_WITH_DIFFICULTIES", label: t("resultDifficulties"), glyph: "~" },
    { result: "PARTIAL", label: t("resultPartial"), glyph: "½" },
    { result: "NOT_HELD", label: t("resultNotHeld"), glyph: "✕" },
  ];

  return (
    <div className="space-y-3">
      {header}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => (
          <Button
            key={option.result}
            variant="outline"
            className="h-auto min-h-9 justify-start whitespace-normal bg-card py-2 text-left"
            onClick={() => choose(option.result)}
          >
            <span aria-hidden className="w-3 shrink-0 text-center font-semibold">
              {option.glyph}
            </span>
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
