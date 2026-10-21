"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { replanService } from "@/services/api/replan.service";
import type { ReplanItem, ReplanProposal } from "@/shared/types/replan";
import { cn } from "@/shared/utils/utils";
import { FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CHANGE_LABEL_KEY, acceptPayload, initialSelection, newOutcomes, timelineOrder } from "./replanLogic";

interface ReplanReviewSheetProps {
  timetableId: string;
  /** The pending proposal. The caller keys the sheet by its id, so the selection starts fresh for each one. */
  proposal: ReplanProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires after accept or reject succeeded, so the caller reloads the turma. */
  onDecided: (decision: "accepted" | "rejected") => void;
}

/** "Proposta de reajuste": the affected lessons in date order, each checked by default. Side sheet on desktop, full screen on mobile. */
export function ReplanReviewSheet({ timetableId, proposal, open, onOpenChange, onDecided }: ReplanReviewSheetProps) {
  const t = useTranslations("replan");
  const locale = useLocale();
  const [selected, setSelected] = useState<Set<string>>(() => initialSelection(proposal.items));
  const [busy, setBusy] = useState(false);
  const items = timelineOrder(proposal.items);

  const toggle = (slotId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });

  const decide = async (decision: "accepted" | "rejected") => {
    setBusy(true);
    try {
      if (decision === "accepted") {
        await replanService.accept(timetableId, proposal.id, acceptPayload(proposal.items, selected));
        toast.success(t("applied"));
      } else {
        await replanService.reject(timetableId, proposal.id);
        toast(t("rejected"));
      }
      onDecided(decision);
    } catch {
      toast.error(t("actionError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[min(880px,90vw)]">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{t("sheetTitle")}</SheetTitle>
          <SheetDescription>{t("sheetDescription")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {proposal.summary && <p className="text-base leading-relaxed text-foreground">{proposal.summary}</p>}

          <ol className="mt-5 space-y-5">
            {items.map((item) => (
              <TimelineRow
                key={item.slotId}
                item={item}
                locale={locale}
                checked={selected.has(item.slotId)}
                onToggle={() => toggle(item.slotId)}
              />
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-background px-4 py-3 sm:px-6">
          <Button variant="outline" onClick={() => void decide("rejected")} disabled={busy}>
            {t("reject")}
          </Button>
          <Button onClick={() => void decide("accepted")} disabled={busy || selected.size === 0}>
            {t("applyLabel", { count: selected.size })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface TimelineRowProps {
  item: ReplanItem;
  locale: string;
  checked: boolean;
  onToggle: () => void;
}

/** One lesson: a narrow date column, the new topic large, the rest in small type. */
function TimelineRow({ item, locale, checked, onToggle }: TimelineRowProps) {
  const t = useTranslations("replan");
  const added = newOutcomes(item);
  const topicChanged = item.before.topicTitle !== item.after.topicTitle;
  const dateLabel = new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });

  return (
    <li className={cn("grid grid-cols-[3.5rem_1fr] gap-x-3 sm:grid-cols-[4.5rem_1fr] sm:gap-x-4", !checked && "opacity-60")}>
      <time dateTime={item.date} className="pt-0.5 text-sm tabular-nums text-muted-foreground">
        {dateLabel}
      </time>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Checkbox
            checked={checked}
            onCheckedChange={onToggle}
            aria-label={t("lessonCheck", { number: item.sequenceNumber })}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {t("lessonNumber", { number: item.sequenceNumber })}
          </span>
          <Badge variant="secondary">{t(CHANGE_LABEL_KEY[item.change])}</Badge>
        </div>

        <div className="space-y-1">
          {topicChanged && item.before.topicTitle && (
            <p className="text-sm text-muted-foreground line-through decoration-muted-foreground/60">
              {item.before.topicTitle}
            </p>
          )}
          <p className="text-lg font-semibold leading-snug text-foreground">{item.after.topicTitle}</p>
        </div>

        {item.after.outcomeTexts.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {item.after.outcomeTexts.map((text) => {
              const isNew = added.includes(text);
              return (
                <li
                  key={text}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs",
                    isNew ? "border-primary/40 bg-primary/10 text-foreground" : "text-muted-foreground",
                  )}
                >
                  {isNew && <span className="mr-1 font-semibold text-primary">{t("newOutcome")}</span>}
                  {text}
                </li>
              );
            })}
          </ul>
        )}

        {item.addition && <p className="text-sm text-foreground">{t("addition", { text: item.addition })}</p>}
        {item.reason && <p className="text-sm text-muted-foreground">{item.reason}</p>}
        {item.hasDocuments && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("documentsNote")}
          </p>
        )}
      </div>
    </li>
  );
}
