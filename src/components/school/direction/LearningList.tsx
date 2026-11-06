"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionLearning } from "@/services/api/school-direction.service";
import type { DirectionLearning } from "@/shared/types/school-direction";
import { cn } from "@/shared/utils/utils";
import { ChevronDown, Lightbulb } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { formatClass, formatSubject } from "./format";
import { TeacherContact } from "./TeacherContact";
import { TurmaDrawer } from "./TurmaDrawer";

type Item = DirectionLearning["items"][number];

function LearningRow({
  item,
  rank,
  open,
  onToggle,
  onOpenTurma,
}: {
  item: Item;
  rank: number;
  open: boolean;
  onToggle: () => void;
  onOpenTurma: (turmaId: string) => void;
}) {
  const t = useTranslations("schoolDirection.learning");
  const locale = useLocale();
  const { turmasFlagged: flagged, turmasTotal: total } = item;

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-start gap-3 rounded-lg py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-direction-late-bg text-sm font-semibold tabular-nums text-direction-late">
          {rank}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{item.text}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {t("summary", {
                  subject: formatSubject(item.subjectKey, item.subjectLabel),
                  grade: item.grade,
                  flagged,
                  total,
                })}
              </span>
            </span>
            {item.hasReinforcement && (
              <span className="whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {t("reinforcement")}
              </span>
            )}
          </span>
          {/* The bar is the flagged share of the classes; the summary line says the same in words. */}
          <span aria-hidden className="mt-2.5 block h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${Math.round((flagged * 100) / total)}%` }}
            />
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("mt-1.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul className="mb-4 ml-11 flex flex-col gap-2 rounded-xl bg-muted/40 p-3 text-sm">
          {item.turmas.map((turma) => (
            <li key={turma.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <button
                type="button"
                onClick={() => onOpenTurma(turma.id)}
                className="rounded font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {formatClass(turma.grade, turma.classLabel, locale)}
              </button>
              <TeacherContact teacher={turma.teacher} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Learning({ items }: { items: Item[] }) {
  const t = useTranslations("schoolDirection.learning");
  const [subject, setSubject] = useState<string | null>(null);
  const [openOutcomeId, setOpenOutcomeId] = useState<string | null>(null);
  const [openTurmaId, setOpenTurmaId] = useState<string | null>(null);
  const subjects = [...new Map(items.map((item) => [item.subjectKey, item])).values()];
  const shown = subject === null ? items : items.filter((item) => item.subjectKey === subject);

  return (
    <>
      {subjects.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ChoiceChip showCheck selected={subject === null} onClick={() => setSubject(null)}>
            {t("allSubjects")}
          </ChoiceChip>
          {subjects.map((item) => (
            <ChoiceChip
              showCheck
              key={item.subjectKey}
              selected={subject === item.subjectKey}
              onClick={() => setSubject(item.subjectKey)}
            >
              {formatSubject(item.subjectKey, item.subjectLabel)}
            </ChoiceChip>
          ))}
        </div>
      )}

      <Card className="gap-0 px-4 py-1 sm:px-6">
        <ol className="divide-y divide-border/60">
          {shown.map((item, i) => (
            <LearningRow
              key={item.outcomeId}
              item={item}
              rank={i + 1}
              open={openOutcomeId === item.outcomeId}
              onToggle={() => setOpenOutcomeId(openOutcomeId === item.outcomeId ? null : item.outcomeId)}
              onOpenTurma={setOpenTurmaId}
            />
          ))}
        </ol>
      </Card>

      <TurmaDrawer turmaId={openTurmaId} onClose={() => setOpenTurmaId(null)} />
    </>
  );
}

/** What most classes found hard lately: the outcomes, never the teachers behind them. */
export function LearningList() {
  const t = useTranslations("schoolDirection.learning");
  const [learning, setLearning] = useState<DirectionLearning | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    getDirectionLearning().then(
      (data) => {
        if (!cancelled) setLearning(data);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {failed ? (
        <LoadError onRetry={() => setAttempt((n) => n + 1)} />
      ) : !learning ? (
        <Card className="gap-0 px-4 py-4 sm:px-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="my-2 h-16 rounded-lg" />
          ))}
        </Card>
      ) : learning.items.length === 0 ? (
        <EmptyState icon={Lightbulb} title={t("empty")} />
      ) : (
        <Learning items={learning.items} />
      )}
    </PageContainer>
  );
}
