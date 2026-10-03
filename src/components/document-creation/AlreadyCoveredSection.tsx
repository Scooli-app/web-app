"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, History, Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { SUBJECTS } from "@/components/document-creation/constants";
import { getCurriculumTopics, type CurriculumTopic } from "@/services/api/timetable.service";
import { cn } from "@/shared/utils/utils";

interface AlreadyCoveredSectionProps {
  /** Internal SUBJECTS id (or, for a curso profissional, the UC / school-component subject name). */
  subject: string;
  gradeLevel: number | string;
  isSpecificComponent?: boolean;
  /** Cursos profissionais have no AE checklist — the teacher describes what was done in the notes. */
  vocational?: boolean;
  /** Covered keys: a whole domain ("Funções") or one of its topics ("Funções > Derivadas"). */
  selectedDomains: string[];
  notes: string;
  onDomainsChange: (keys: string[]) => void;
  onNotesChange: (notes: string) => void;
  className?: string;
}

interface DomainGroup {
  domain: string;
  /** Index of the group's first topic in the flat, programme-ordered list. */
  start: number;
  topics: CurriculumTopic[];
}

function groupByDomain(topics: CurriculumTopic[]): DomainGroup[] {
  const groups: DomainGroup[] = [];
  topics.forEach((topic, index) => {
    const last = groups[groups.length - 1];
    if (last && last.domain === topic.domain) last.topics.push(topic);
    else groups.push({ domain: topic.domain, start: index, topics: [topic] });
  });
  return groups;
}

/** A native checkbox that can show "some of this domain is done". */
function TriStateCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
    />
  );
}

/**
 * Lets a teacher creating a turma mid-year (from scratch, or one-click from a
 * planificação) mark what's already been taught, so topic generation doesn't
 * restart the subject from lesson 1. Two mechanisms on purpose: a structured,
 * AE-ordered checklist of domains and their topics (recognition — reliable
 * even when the teacher's memory of everything they covered is fuzzy) plus
 * free text as a catch-all for anything not on that list. See
 * TimetableService.generateTopics / CurriculumTopics on the backend.
 *
 * The selection is kept compact: a fully ticked domain is sent as the domain
 * itself, so the backend excludes everything under it — including content
 * the AE files directly under the domain, outside any topic.
 */
export function AlreadyCoveredSection({
  subject,
  gradeLevel,
  isSpecificComponent,
  vocational = false,
  selectedDomains,
  notes,
  onDomainsChange,
  onNotesChange,
  className,
}: AlreadyCoveredSectionProps) {
  const t = useTranslations("calendar.novo");
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const year = Number(gradeLevel) || 0;

  // Read inside the fetch effect without re-running it on every tick.
  const selectionRef = useRef({ selectedDomains, onDomainsChange });
  selectionRef.current = { selectedDomains, onDomainsChange };

  useEffect(() => {
    if (vocational || !subject || !year) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const subjectValue = SUBJECTS.find((s) => s.id === subject)?.value ?? subject;
    getCurriculumTopics(subjectValue, year, isSpecificComponent)
      .then((res) => {
        if (cancelled) return;
        setTopics(res);
        // Drop what was ticked for a previous subject/year — it would be sent
        // invisibly otherwise.
        const valid = new Set(res.flatMap((topic) => [topic.key, topic.domain]));
        const { selectedDomains: current, onDomainsChange: change } = selectionRef.current;
        const kept = current.filter((key) => valid.has(key));
        if (kept.length !== current.length) change(kept);
      })
      .catch(() => { if (!cancelled) setTopics([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subject, year, isSpecificComponent, vocational]);

  const groups = useMemo(() => groupByDomain(topics), [topics]);

  if (!subject || !year) return null;

  const covered = new Set(selectedDomains);
  const isChecked = (topic: CurriculumTopic) => covered.has(topic.key) || covered.has(topic.domain);
  const checkedCount = topics.filter(isChecked).length;

  const commit = (checkedKeys: Set<string>) => {
    const next: string[] = [];
    for (const group of groups) {
      const groupChecked = group.topics.filter((topic) => checkedKeys.has(topic.key));
      if (groupChecked.length === group.topics.length) next.push(group.domain);
      else groupChecked.forEach((topic) => next.push(topic.key));
    }
    onDomainsChange(next);
  };
  const currentlyChecked = () => new Set(topics.filter(isChecked).map((topic) => topic.key));

  const toggleTopic = (topic: CurriculumTopic) => {
    const checked = currentlyChecked();
    if (checked.has(topic.key)) checked.delete(topic.key);
    else checked.add(topic.key);
    commit(checked);
  };

  const toggleGroup = (group: DomainGroup) => {
    const checked = currentlyChecked();
    const allChecked = group.topics.every((topic) => checked.has(topic.key));
    group.topics.forEach((topic) => (allChecked ? checked.delete(topic.key) : checked.add(topic.key)));
    commit(checked);
  };

  // Content is sequential — "até aqui" ticks everything up to and including
  // that point in programme order in one click; individual toggles stay
  // available for teachers who taught out of the canonical order.
  const markUpTo = (index: number) =>
    commit(new Set(topics.slice(0, index + 1).map((topic) => topic.key)));

  const hasContent = checkedCount > 0 || notes.trim().length > 0;

  const upToHereButton = (index: number) => (
    <button
      type="button"
      className="shrink-0 whitespace-nowrap rounded px-1.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 sm:text-xs"
      onClick={() => markUpTo(index)}
    >
      {t("alreadyCovered.markUpToHere")}
    </button>
  );

  // The whole row label toggles, not just the box — easier to hit on a phone.
  const row = (
    key: string,
    checkbox: React.ReactNode,
    text: React.ReactNode,
    upToIndex: number,
    className?: string
  ) => (
    <div key={key} className={cn("flex items-start gap-1 rounded-lg px-1.5 hover:bg-muted/50 sm:px-2", className)}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 py-1.5">
        <span className="mt-0.5 flex">{checkbox}</span>
        <span className="min-w-0 flex-1 text-sm leading-snug">{text}</span>
      </label>
      <span className="pt-1">{upToHereButton(upToIndex)}</span>
    </div>
  );

  return (
    <div className={cn("overflow-hidden rounded-xl border border-primary/30 bg-primary/5", className)}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <History className="h-4 w-4 text-primary" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{t("alreadyCovered.title")}</span>
          {/* The summary only replaces the subtitle once collapsed — swapping it while
              ticking would shift the list under the teacher's finger. */}
          <span className="block text-xs text-muted-foreground">
            {hasContent && !expanded
              ? t("alreadyCovered.summary", { count: checkedCount })
              : t("alreadyCovered.subtitle")}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-primary/20 bg-background px-2 py-3 sm:px-4 sm:py-4">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : groups.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2 px-1.5 sm:px-2">
                <Label className="text-xs leading-snug text-muted-foreground">{t("alreadyCovered.domainsLabel")}</Label>
                {/* Always rendered (hidden when empty) so ticking never reflows the list. */}
                <button
                  type="button"
                  className={cn(
                    "shrink-0 whitespace-nowrap text-xs text-muted-foreground hover:text-foreground hover:underline",
                    checkedCount === 0 && "invisible"
                  )}
                  onClick={() => onDomainsChange([])}
                  tabIndex={checkedCount === 0 ? -1 : undefined}
                >
                  {t("alreadyCovered.clear")}
                </button>
              </div>
              {/* Scrolls inside its box on larger screens; on a phone the page itself scrolls. */}
              <div className="space-y-0.5 sm:max-h-80 sm:overflow-y-auto sm:pr-1">
                {groups.map((group) => {
                  const groupCheckedCount = group.topics.filter(isChecked).length;
                  const lastIndex = group.start + group.topics.length - 1;
                  const groupCheckbox = (
                    <TriStateCheckbox
                      checked={groupCheckedCount === group.topics.length}
                      indeterminate={groupCheckedCount > 0}
                      onChange={() => toggleGroup(group)}
                      label={group.domain}
                    />
                  );

                  // One item — a domain the AE doesn't subdivide, or one with a single
                  // topic — is a single row rather than a header over one child.
                  if (group.topics.length === 1) {
                    const [topic] = group.topics;
                    return row(
                      group.domain,
                      groupCheckbox,
                      <>
                        <span className="font-medium text-foreground">{group.domain}</span>
                        {topic.key !== group.domain && (
                          <span className="text-muted-foreground"> · {topic.label}</span>
                        )}
                      </>,
                      lastIndex
                    );
                  }

                  return (
                    <div key={group.domain}>
                      {row(
                        `${group.domain}-header`,
                        groupCheckbox,
                        <span className="font-medium text-foreground">{group.domain}</span>,
                        lastIndex
                      )}
                      <div className="ml-3.5 border-l border-border pl-1 sm:ml-6 sm:pl-2">
                        {group.topics.map((topic, offset) =>
                          row(
                            topic.key,
                            <TriStateCheckbox
                              checked={isChecked(topic)}
                              onChange={() => toggleTopic(topic)}
                              label={topic.label}
                            />,
                            <span className="text-foreground/90">{topic.label}</span>,
                            group.start + offset
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {groups.length > 0 ? t("alreadyCovered.notesLabel") : t("alreadyCovered.notesOnlyLabel")}
            </Label>
            <textarea
              className="min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("alreadyCovered.notesPlaceholder")}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
