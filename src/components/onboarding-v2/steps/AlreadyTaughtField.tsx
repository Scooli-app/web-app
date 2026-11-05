"use client";

import { suggestedTaughtCount } from "@/components/onboarding-v2/schoolCalendar";
import { Textarea } from "@/components/ui/textarea";
import { getTopicDomains, type CurriculumTopic } from "@/services/api/timetable.service";
import { selectIsAlreadyCoveredEnabled } from "@/store/features/selectors";
import { cn } from "@/shared/utils/utils";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { useSelector } from "react-redux";

/** Mirrors AlreadyCoveredNotes.MAX_LENGTH on the backend, which truncates anything longer. */
const MAX_LENGTH = 2000;

interface AlreadyTaughtFieldProps {
  /** Canonical subject value; null when the class has no AE topics (a vocational UC). */
  subject: string | null;
  gradeLevel: number;
  /** "5.º B", or empty when the class has no letter yet. */
  classLabel: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  taught: CurriculumTopic[];
  onTaughtChange: (topics: CurriculumTopic[]) => void;
}

/**
 * "O que já deste?": the teacher's own words, and the year's topics as chips already ticked for what is usually
 * taught by today (a suggestion, fixed with a tap). Hidden while already_covered_enabled is off: the server ignores
 * the answers then.
 */
export function AlreadyTaughtField({
  subject,
  gradeLevel,
  classLabel,
  notes,
  onNotesChange,
  taught,
  onTaughtChange,
}: AlreadyTaughtFieldProps) {
  const t = useTranslations("onboardingV2.class.taught");
  const locale = useLocale();
  const enabled = useSelector(selectIsAlreadyCoveredEnabled);
  const textareaId = useId();
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [touched, setTouched] = useState(false);

  // A new subject or year brings its own topics, pre-ticked again from the date.
  useEffect(() => {
    if (!enabled || !subject) {
      setTopics([]);
      onTaughtChange([]);
      return;
    }
    let cancelled = false;
    getTopicDomains(subject, gradeLevel)
      .then((loaded) => {
        if (cancelled) return;
        setTopics(loaded);
        setTouched(false);
        onTaughtChange(loaded.slice(0, suggestedTaughtCount(loaded.length, new Date())));
      })
      .catch(() => {
        // The text box still works without the chips.
        if (!cancelled) setTopics([]);
      });
    return () => {
      cancelled = true;
    };
    // onTaughtChange is a state setter from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, subject, gradeLevel]);

  if (!enabled) return null;

  const taughtKeys = new Set(taught.map((topic) => topic.key));
  const toggle = (topic: CurriculumTopic) => {
    setTouched(true);
    onTaughtChange(
      taughtKeys.has(topic.key)
        ? taught.filter((item) => item.key !== topic.key)
        : topics.filter((item) => item.key === topic.key || taughtKeys.has(item.key)),
    );
  };
  const today = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(new Date());
  const label = classLabel.trim();

  return (
    <div className="space-y-2">
      <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
        {label ? t("title", { label }) : t("titleNoLabel")}
      </label>
      <Textarea
        id={textareaId}
        rows={2}
        maxLength={MAX_LENGTH}
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder={t("placeholder")}
        className="min-h-16 resize-none"
      />
      {topics.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("count", { count: taught.length, total: topics.length })}
            {!touched && ` · ${t("suggestion", { date: today })}`}
            {taught.length > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => {
                    setTouched(true);
                    onTaughtChange([]);
                  }}
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("notStarted")}
                </button>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic) => {
              const on = taughtKeys.has(topic.key);
              return (
                <button
                  key={topic.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(topic)}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                    on
                      ? "border-primary bg-primary/10 font-medium text-foreground"
                      : "border-input bg-card text-foreground hover:bg-accent",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                  {topic.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
