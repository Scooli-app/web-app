"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NOTE_MAX_LENGTH } from "@/hooks/checkInQueue";
import { checkInService } from "@/services/api/check-in.service";
import type { CheckInOutcome, CheckInOutcomeOptions, CheckInResult, MissingAmount } from "@/shared/types/check-in";
import { cn } from "@/shared/utils/utils";
import { AlertTriangle, Check, CircleDashed, Info, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

/*
 * Each result's icon and the tinted circle behind it. Colour lives only in the icon, so the four buttons read as one
 * set and the selected one (brand outline and fill) stands out. Class names are written out so Tailwind generates them.
 */
const RESULT_STYLE: Record<CheckInResult, { icon: LucideIcon; tint: string }> = {
  TAUGHT: { icon: Check, tint: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  TAUGHT_WITH_DIFFICULTIES: { icon: AlertTriangle, tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  PARTIAL: { icon: CircleDashed, tint: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  NOT_HELD: { icon: X, tint: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * The four "Como correu?" results as equal buttons, icon above label: four in a row, two by two below 520px. Shared
 * by the dashboard card, the calendar dialog and the in-flow prompt, so all three look and behave the same.
 * `selected` marks the answer already chosen (aria-pressed), e.g. after "Voltar" from the detail step.
 */
export function CheckInResultOptions({
  onChoose,
  selected,
}: {
  onChoose: (result: CheckInResult) => void;
  selected?: CheckInResult | null;
}) {
  const t = useTranslations("checkIns");
  const options: { result: CheckInResult; label: string }[] = [
    { result: "TAUGHT", label: t("resultTaught") },
    { result: "TAUGHT_WITH_DIFFICULTIES", label: t("resultDifficulties") },
    { result: "PARTIAL", label: t("resultPartial") },
    { result: "NOT_HELD", label: t("resultNotHeld") },
  ];
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-2 min-[520px]:grid-cols-4">
      {options.map((option) => {
        const { icon: Icon, tint } = RESULT_STYLE[option.result];
        const pressed = selected === option.result;
        return (
          <button
            key={option.result}
            type="button"
            aria-pressed={pressed}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1.5 py-3 text-center text-sm font-medium leading-tight text-foreground transition-colors hover:border-primary/60",
              FOCUS_RING,
              pressed ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
            onClick={() => onChoose(option.result)}
          >
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", tint)} aria-hidden>
              <Icon className="size-4" />
            </span>
            <span className="[overflow-wrap:anywhere]">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The two results that open this step. */
export type OutcomeStepResult = Extract<CheckInResult, "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL">;

/** The extras the step collects, passed to `onSave` with the ticked outcomes. */
export interface OutcomeStepExtras {
  missingAmount?: MissingAmount;
  note?: string;
}

/** The amounts "Quanto ficou por dar?" offers, in the order they read. */
export const MISSING_AMOUNTS: { value: MissingAmount; labelKey: "missingLittle" | "missingHalf" | "missingMost" }[] = [
  { value: "LITTLE", labelKey: "missingLittle" },
  { value: "HALF", labelKey: "missingHalf" },
  { value: "MOST", labelKey: "missingMost" },
];

/** More outcomes than this get a search box and "Ver mais". */
export const VISIBLE_OUTCOMES = 6;

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * The lesson's own outcomes or, when it has none, the ones the backend offers instead: its plan unit's or the
 * subject's catalogue (ENG-424). Without the lesson's ids, or when the request fails (an older server), the list
 * stays empty and the step works as before.
 */
function useOfferedOutcomes(own: CheckInOutcome[], lesson?: { timetableId: string; slotId: string }) {
  const [fallback, setFallback] = useState<CheckInOutcomeOptions | null>(null);
  const timetableId = lesson?.timetableId;
  const slotId = lesson?.slotId;
  const hasOwn = own.length > 0;
  useEffect(() => {
    if (hasOwn || !timetableId || !slotId) return;
    let cancelled = false;
    checkInService
      .getOutcomes(timetableId, slotId)
      .then((options) => {
        if (!cancelled) setFallback(options);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasOwn, timetableId, slotId]);
  if (hasOwn) return { outcomes: own, source: "lesson" as const };
  return { outcomes: fallback?.outcomes ?? [], source: fallback?.source ?? null };
}

/**
 * The second step after "com dificuldades" or "ficou a meio". "Ficou a meio" first asks how much was left (optional).
 * Then the outcomes as selectable cards: the lesson's own, or a fallback with a line saying where it comes from; a lone
 * own outcome is already ticked. Past {@link VISIBLE_OUTCOMES} a search box and "Ver mais" keep the list short. Then an
 * optional note with a live counter, and "Voltar" / "Guardar" in a footer that stays in view while the body scrolls.
 * With no outcomes at all, only the amount and the note are asked.
 */
export function CheckInOutcomeStep({
  question,
  result,
  outcomes,
  lesson,
  selected,
  onToggle,
  onSave,
  onBack,
}: {
  question: string;
  result: OutcomeStepResult;
  outcomes: CheckInOutcome[];
  /** The lesson's ids, to load fallback outcomes when it has none of its own. */
  lesson?: { timetableId: string; slotId: string };
  selected: readonly string[];
  onToggle: (id: string) => void;
  onSave: (extras: OutcomeStepExtras) => void;
  onBack: () => void;
}) {
  const t = useTranslations("checkIns");
  const [missingAmount, setMissingAmount] = useState<MissingAmount | undefined>(undefined);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const amountId = useId();
  const questionId = useId();
  const noteId = useId();
  const counterId = useId();
  const offered = useOfferedOutcomes(outcomes, lesson);

  const needle = fold(query.trim());
  const matching = needle
    ? offered.outcomes.filter((outcome) => fold(`${outcome.text} ${outcome.topicPath.join(" ")}`).includes(needle))
    : offered.outcomes;
  const shown = showAll || needle ? matching : matching.slice(0, VISIBLE_OUTCOMES);
  const hidden = matching.length - shown.length;

  return (
    <div className="space-y-4">
      {result === "PARTIAL" && (
        <div className="space-y-1.5">
          <p id={amountId} className="text-sm font-medium text-foreground">
            {t("missingAmountQuestion")}
          </p>
          <div role="group" aria-labelledby={amountId} className="grid grid-cols-3 gap-2">
            {MISSING_AMOUNTS.map((amount, index) => {
              const pressed = missingAmount === amount.value;
              return (
                <button
                  key={amount.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setMissingAmount(pressed ? undefined : amount.value)}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1.5 rounded-lg border px-1.5 py-2 text-sm text-foreground transition-colors hover:border-primary/60",
                    FOCUS_RING,
                    pressed ? "border-primary bg-primary/10 font-medium" : "border-border bg-card",
                  )}
                >
                  <span className={cn("flex gap-0.5", pressed ? "text-primary" : "text-muted-foreground")} aria-hidden>
                    {[0, 1, 2].map((segment) => (
                      <i
                        key={segment}
                        className={cn("h-1.5 w-3.5 rounded-full", segment <= index ? "bg-current" : "bg-border")}
                      />
                    ))}
                  </span>
                  <span className="[overflow-wrap:anywhere]">{t(amount.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {offered.outcomes.length > 0 && (
        <div className="space-y-2">
          <p id={questionId} className="text-sm font-medium text-foreground">
            {question}
          </p>
          {(offered.source === "unit" || offered.source === "catalogue") && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{t(offered.source === "unit" ? "outcomesFromUnit" : "outcomesFromCatalogue")}</span>
            </p>
          )}
          {offered.outcomes.length > VISIBLE_OUTCOMES && (
            <Input
              type="search"
              value={query}
              aria-label={t("outcomeSearch")}
              placeholder={t("outcomeSearch")}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          <ul role="group" aria-labelledby={questionId} className="space-y-1.5">
            {shown.map((outcome) => {
              const checked = selected.includes(outcome.id);
              const topic = outcome.topicPath.at(-1);
              return (
                <li key={outcome.id}>
                  <label
                    title={outcome.text}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent",
                      checked ? "border-primary/60 bg-primary/5" : "bg-card",
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => onToggle(outcome.id)} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      {topic && (
                        <span className="block truncate text-xs text-muted-foreground">{topic}</span>
                      )}
                      <span className="line-clamp-2 leading-snug [overflow-wrap:anywhere]">{outcome.text}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {matching.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("outcomeSearchEmpty", { query: query.trim() })}</p>
          )}
          {hidden > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setShowAll(true)}>
              {t("outcomesShowMore", { count: hidden })}
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={noteId} className="text-sm font-medium text-foreground">
            {t("noteLabel")}
          </Label>
          <span id={counterId} className="font-mono text-xs tabular-nums text-muted-foreground">
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id={noteId}
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
          aria-describedby={counterId}
          placeholder={t("notePlaceholder")}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-16 text-sm"
        />
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t border-border bg-card py-2">
        <Button size="sm" variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              missingAmount: result === "PARTIAL" ? missingAmount : undefined,
              note: note.trim() || undefined,
            })
          }
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
