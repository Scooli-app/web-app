"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { replanService } from "@/services/api/replan.service";
import type { ReplanChange, ReplanItem, ReplanProposal } from "@/shared/types/replan";
import { cn } from "@/shared/utils/utils";
import { ChevronDown, ChevronRight, FileText, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CHANGE_LABEL_KEY, acceptPayload, initialSelection, newOutcomes, timelineOrder } from "./replanLogic";

/** The order of the groups: the lessons that gain something first, a plain new topic last. */
const GROUP_ORDER: ReplanChange[] = ["reinforcement", "extended", "merged", "retitled"];
/** A group with more lessons than this starts closed, so a whole term's shift opens as a few lines. */
const OPEN_GROUP_MAX = 3;

interface ReplanReviewSheetProps {
  timetableId: string;
  /** The pending proposal. The caller keys the sheet by its id, so the selection starts fresh for each one. */
  proposal: ReplanProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires after accept or reject succeeded, so the caller reloads the turma. */
  onDecided: (decision: "accepted" | "rejected") => void;
}

/**
 * "Proposta de reajuste": the affected lessons grouped by kind of change, each checked by default and opening to its
 * details. Side sheet on desktop, full screen on mobile; the header and the footer stay put while the lessons scroll.
 */
export function ReplanReviewSheet({ timetableId, proposal, open, onOpenChange, onDecided }: ReplanReviewSheetProps) {
  const t = useTranslations("replan");
  const locale = useLocale();
  const [selected, setSelected] = useState<Set<string>>(() => initialSelection(proposal.items));
  const [busy, setBusy] = useState(false);
  const items = timelineOrder(proposal.items);
  const groups = GROUP_ORDER.map((change) => ({ change, items: items.filter((item) => item.change === change) })).filter(
    (group) => group.items.length > 0,
  );
  const allChecked = selected.size === items.length;

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
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 outline-none sm:max-w-xl"
        // Focus the sheet itself: the first focusable is the summary, and focusing it would pop its tooltip open.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <SheetHeader className="gap-1 border-b pr-12">
          <SheetTitle>{t("sheetActionTitle", { count: items.length })}</SheetTitle>
          {proposal.summary ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetDescription
                  tabIndex={0}
                  className="line-clamp-1 cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {proposal.summary}
                </SheetDescription>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-left">{proposal.summary}</TooltipContent>
            </Tooltip>
          ) : (
            <SheetDescription>{t("sheetDescription")}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {groups.map((group) => (
            <ChangeGroup
              key={group.change}
              label={t(CHANGE_LABEL_KEY[group.change])}
              items={group.items}
              locale={locale}
              selected={selected}
              onToggle={toggle}
              rowsOpen={items.length === 1}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 border-t bg-background px-4 py-3 sm:px-6">
          {items.length > 1 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={allChecked ? true : selected.size > 0 ? "indeterminate" : false}
                onCheckedChange={() => setSelected(allChecked ? new Set() : initialSelection(proposal.items))}
              />
              {t("selectAll")}
            </label>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => void decide("rejected")} disabled={busy}>
              {t("reject")}
            </Button>
            <Button onClick={() => void decide("accepted")} disabled={busy || selected.size === 0}>
              {t("applyLabel", { count: selected.size })}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ChangeGroupProps {
  label: string;
  items: ReplanItem[];
  locale: string;
  selected: ReadonlySet<string>;
  onToggle: (slotId: string) => void;
  rowsOpen: boolean;
}

function ChangeGroup({ label, items, locale, selected, onToggle, rowsOpen }: ChangeGroupProps) {
  const [open, setOpen] = useState(items.length <= OPEN_GROUP_MAX);

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-sm py-1 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
        {label}
        <span className="font-normal text-muted-foreground">{items.length}</span>
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1.5">
          {items.map((item) => (
            <LessonRow
              key={item.slotId}
              item={item}
              locale={locale}
              checked={selected.has(item.slotId)}
              onToggle={() => onToggle(item.slotId)}
              defaultOpen={rowsOpen}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

interface LessonRowProps {
  item: ReplanItem;
  locale: string;
  checked: boolean;
  onToggle: () => void;
  defaultOpen: boolean;
}

/** One lesson in a line (date, number and topic, a summary chip) that opens to what changes in it. */
function LessonRow({ item, locale, checked, onToggle, defaultOpen }: LessonRowProps) {
  const t = useTranslations("replan");
  const [open, setOpen] = useState(defaultOpen);
  const added = newOutcomes(item);
  const topic = item.after.topicTitle ?? "";
  const topicChanged = !!item.before.topicTitle && item.before.topicTitle !== item.after.topicTitle;
  const dateLabel = new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const title = `${t("lessonNumber", { number: item.sequenceNumber })} · ${topic}`;
  const chip =
    added.length > 0
      ? t("chipOutcomes", { count: added.length })
      : topicChanged
        ? t("changeRetitled")
        : t(CHANGE_LABEL_KEY[item.change]);

  return (
    <li className={cn("rounded-xl border bg-card", !checked && "opacity-60")}>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          aria-label={t("lessonCheck", { number: item.sequenceNumber })}
        />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-0.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <time dateTime={item.date} className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground max-sm:hidden">
            {dateLabel}
          </time>
          <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={title}>
            {title}
          </span>
          <Badge variant="secondary" className="shrink-0">
            {chip}
          </Badge>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 pb-3 text-sm sm:pl-9">
          <dt className="text-xs leading-5 text-muted-foreground">{t("detailTopic")}</dt>
          <dd className="min-w-0">
            {topicChanged ? (
              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                <s className="max-w-full truncate text-muted-foreground" title={item.before.topicTitle ?? ""}>
                  {item.before.topicTitle}
                </s>
                <span aria-hidden>→</span>
                <span className="max-w-full truncate font-medium" title={topic}>
                  {topic}
                </span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate" title={topic}>
                  {topic}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {t("topicKept")}
                </Badge>
              </span>
            )}
          </dd>

          {(item.addition || item.reason) && (
            <>
              <dt className="text-xs leading-5 text-muted-foreground">{t("detailChange")}</dt>
              <dd className="min-w-0 space-y-0.5 wrap-anywhere">
                {item.addition && <p>{t("addition", { text: item.addition })}</p>}
                {item.reason && <p className="text-muted-foreground">{item.reason}</p>}
              </dd>
            </>
          )}

          {item.after.outcomeTexts.length > 0 && (
            <>
              <dt className="text-xs leading-5 text-muted-foreground">{t("detailOutcomes")}</dt>
              <dd className="min-w-0">
                <ul className="space-y-1.5">
                  {item.after.outcomeTexts.map((text) => (
                    <li key={text} className="flex min-w-0 items-center gap-1.5">
                      {added.includes(text) && (
                        <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          + {t("newOutcome")}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">{text}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={t("outcomeFull")}
                            className="shrink-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-left">{text}</TooltipContent>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}

          {item.hasDocuments && (
            <dd className="col-span-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("documentsNote")}
            </dd>
          )}
        </dl>
      )}
    </li>
  );
}
