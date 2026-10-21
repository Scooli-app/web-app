"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PilotMetricsRow } from "@/shared/types/pilot-metrics";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import { formatCount, formatPercent, weekShortLabel } from "./format";
import { type PilotTurmaGroup, ratio } from "./pilot-metrics";

function RateBar({ rate, title }: { rate: number | null; title?: string }) {
  return (
    <div className="flex items-center justify-end gap-2" title={title}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:w-20">
        {rate !== null && (
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(rate * 100)}%` }} />
        )}
      </div>
      <span className="w-10 text-right font-mono text-xs font-medium tabular-nums">{formatPercent(rate)}</span>
    </div>
  );
}

function WeekBreakdown({ group, weeks }: { group: PilotTurmaGroup; weeks: string[] }) {
  const t = useTranslations("adminPilot");

  const items = (row: PilotMetricsRow): { label: string; value: string }[] => {
    const n = formatCount;
    return [
      { label: t("weekly.due"), value: n(row.lessonsDue) },
      { label: t("weekly.answered"), value: n(row.answered) },
      { label: t("weekly.assumed"), value: n(row.assumed) },
      { label: t("weekly.unanswered"), value: n(row.unanswered) },
      { label: t("weekly.notHeld"), value: n(row.notHeld) },
      { label: t("weekly.partial"), value: n(row.partial) },
      { label: t("weekly.difficulties"), value: n(row.difficulties) },
      {
        label: t("weekly.topics"),
        value: t("breakdown.topics", {
          accepted: n(row.topicProposals.accepted),
          rejected: n(row.topicProposals.rejected),
          pending: n(row.topicProposals.pending),
        }),
      },
      {
        label: t("weekly.docs"),
        value: t("breakdown.docs", {
          appliedAll: n(row.docSuggestions.appliedAll),
          appliedPartial: n(row.docSuggestions.appliedPartial),
          rejected: n(row.docSuggestions.rejected),
          pending: n(row.docSuggestions.pending),
        }),
      },
      {
        label: t("weekly.replans"),
        value: t("breakdown.replans", {
          accepted: n(row.replans.accepted),
          partiallyAccepted: n(row.replans.partiallyAccepted),
          rejected: n(row.replans.rejected),
          failed: n(row.replans.failed),
          noChange: n(row.replans.noChange),
          pending: n(row.replans.pending),
        }),
      },
      {
        label: t("weekly.loop"),
        value: t("breakdown.loop", {
          completed: n(row.loopCompleted),
          started: n(row.loopStarted),
        }),
      },
    ];
  };

  return (
    <div className="space-y-4 py-2">
      {weeks.map((week) => {
        const row = group.byWeek[week];
        return (
          <section key={week} aria-label={week}>
            <h3 className="mb-2 text-sm font-semibold">{week}</h3>
            {row ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                {items(row).map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="font-medium break-words">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{t("table.noActivity")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

interface PilotTurmaTableProps {
  groups: PilotTurmaGroup[];
  weeks: string[];
}

export function PilotTurmaTable({ groups, weeks }: PilotTurmaTableProps) {
  const t = useTranslations("adminPilot");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead className="min-w-44">{t("table.teacher")}</TableHead>
            <TableHead className="min-w-36">{t("table.turma")}</TableHead>
            {weeks.map((week) => (
              <TableHead key={week} className="min-w-28 text-right" title={week}>
                {weekShortLabel(week)}
              </TableHead>
            ))}
            <TableHead className="min-w-28 text-right font-semibold">{t("table.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const isOpen = expanded.has(group.key);
            return (
              <Fragment key={group.key}>
                <TableRow className="align-top">
                  <TableCell className="w-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? t("table.hideWeeks") : t("table.showWeeks")}
                      onClick={() => toggle(group.key)}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-56 truncate" title={group.teacherEmail}>
                    {group.teacherEmail}
                  </TableCell>
                  <TableCell className="max-w-44 truncate" title={group.turmaTitle}>
                    {group.turmaTitle}
                  </TableCell>
                  {weeks.map((week) => {
                    const row = group.byWeek[week];
                    const weekRate = row ? ratio(row.answered, row.lessonsDue) : null;
                    const title =
                      row && row.lessonsDue > 0
                        ? t("cell.answeredOf", {
                            answered: formatCount(row.answered),
                            due: formatCount(row.lessonsDue),
                          })
                        : undefined;
                    return (
                      <TableCell key={week} className="text-right">
                        <RateBar rate={weekRate} title={title} />
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    <RateBar rate={group.answerRate} />
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={weeks.length + 4}>
                      <WeekBreakdown group={group} weeks={weeks} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
