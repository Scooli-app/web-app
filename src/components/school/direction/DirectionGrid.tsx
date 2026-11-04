"use client";

import type { DirectionOverview, DirectionTurma, TurmaState } from "@/shared/types/school-direction";
import { cn } from "@/shared/utils/utils";
import { AlertTriangle, Eye, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatClass, formatSubject } from "./format";
import { STATE_CLASSES } from "./StatePill";

// The shape that tells the states apart without colour; "on track" is the plain cell.
const STATE_ICONS: Partial<Record<TurmaState, LucideIcon>> = { watch: Eye, behind: AlertTriangle };

interface ClassRow {
  key: string;
  grade: number;
  classLabel: string;
  turmas: DirectionTurma[];
}

function classRows(turmas: DirectionTurma[], locale: string): ClassRow[] {
  const rows = new Map<string, ClassRow>();
  for (const turma of turmas) {
    const key = `${turma.grade}|${turma.classLabel}`;
    const row = rows.get(key) ?? { key, grade: turma.grade, classLabel: turma.classLabel, turmas: [] };
    row.turmas.push(turma);
    rows.set(key, row);
  }
  return [...rows.values()].sort(
    (a, b) => a.grade - b.grade || a.classLabel.localeCompare(b.classLabel, locale, { numeric: true }),
  );
}

export function GridLegend({ className }: { className?: string }) {
  const t = useTranslations("schoolDirection");

  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {(["on_track", "watch", "behind"] as const).map((state) => {
        const Icon = STATE_ICONS[state];
        return (
          <li key={state} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("inline-flex size-4 items-center justify-center rounded", STATE_CLASSES[state])}
            >
              {Icon && <Icon className="size-2.5" />}
            </span>
            {t(`states.${state}`)}
          </li>
        );
      })}
    </ul>
  );
}

interface DirectionGridProps {
  turmas: DirectionTurma[];
  subjects: DirectionOverview["subjects"];
  onOpen: (turmaId: string) => void;
}

/** Classes × subjects. Only the columns and rows that still have a turma are shown. */
export function DirectionGrid({ turmas, subjects, onOpen }: DirectionGridProps) {
  const t = useTranslations("schoolDirection");
  const locale = useLocale();
  const columns = subjects.filter((subject) => turmas.some((turma) => turma.subjectKey === subject.key));
  const rows = classRows(turmas, locale);

  const cell = (turma: DirectionTurma, classText: string, shared: boolean) => {
    const Icon = STATE_ICONS[turma.state];
    const percent = turma.executionPercent === null ? null : `${turma.executionPercent}%`;
    const text = turma.state === "no_records" ? t("states.no_records") : (percent ?? "—");
    const subject = formatSubject(turma.subjectKey, turma.subjectLabel);
    // behindTopic is the reason for watch/behind; the tooltip alone does not reach touch and screen-reader users.
    const label = [classText, subject, t(`states.${turma.state}`), percent, shared && turma.title, turma.behindTopic]
      .filter(Boolean)
      .join(" · ");

    return (
      <button
        key={turma.id}
        type="button"
        onClick={() => onOpen(turma.id)}
        title={[turma.title, turma.behindTopic].filter(Boolean).join(" · ")}
        aria-label={label}
        className={cn(
          "flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-medium tabular-nums transition-shadow",
          "outline-none hover:ring-1 hover:ring-current focus-visible:ring-2 focus-visible:ring-ring",
          STATE_CLASSES[turma.state],
        )}
      >
        {Icon && <Icon aria-hidden className="size-3 shrink-0" />}
        <span className="truncate">{text}</span>
      </button>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-card">
              <span className="sr-only">{t("grid.classColumn")}</span>
            </th>
            {columns.map((subject) => (
              <th key={subject.key} scope="col" className="px-1 pb-1 text-center text-xs font-normal text-muted-foreground">
                {formatSubject(subject.key, subject.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const classText = formatClass(row.grade, row.classLabel, locale);
            return (
              <tr key={row.key}>
                {/* The shadow covers the cell spacing so scrolled cells don't show through beside the sticky column. */}
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-32 whitespace-nowrap bg-card pr-3 text-left font-semibold text-foreground shadow-[6px_0_0_var(--card)] sm:max-w-48"
                >
                  {classText}
                </th>
                {columns.map((subject) => {
                  const here = row.turmas.filter((turma) => turma.subjectKey === subject.key);
                  return (
                    <td key={subject.key} className="min-w-[5.5rem] p-0">
                      {here.length === 0 ? (
                        <div className="h-9 rounded-lg bg-muted/40" />
                      ) : (
                        <div className="flex gap-1">{here.map((turma) => cell(turma, classText, here.length > 1))}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
