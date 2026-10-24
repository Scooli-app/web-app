"use client";

import { InlineText } from "@/components/blocks/inline-text";
import { cn } from "@/shared/utils/utils";
import type { AssessmentItem } from "@/types/assessment";
import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { AssessmentEditorContext, type AssessmentEditorContextValue } from "./context";
import { ExerciseView, ReadingView } from "./ExerciseView";
import { exerciseNumbers, parseAssessment } from "./model";

const noop = () => undefined;

/** The editor context for read-only rendering outside the editor (reviews, moderation, community). */
export function ReadOnlyAssessment({ studentView, children }: { studentView: boolean; children: ReactNode }) {
  const value = useMemo<AssessmentEditorContextValue>(
    () => ({ studentView, phone: false, aeLookup: {}, showAe: false, searchAe: null, rememberAe: noop, requestImage: noop }),
    [studentView],
  );
  return <AssessmentEditorContext.Provider value={value}>{children}</AssessmentEditorContext.Provider>;
}

const PAPER = "rounded-md border border-neutral-200 bg-white font-serif text-neutral-900";

// AE goals are left out: there is nothing here to look their texts up with.
const shown = (item: AssessmentItem): AssessmentItem => (item.kind === "exercise" ? { ...item, aeOutcomeIds: [] } : item);

/** One exercise or reading box as it prints, small: the before/after of a suggestion review. Teacher view by default. */
export function CompactItem({ item, number, studentView = false }: { item: AssessmentItem; number: number | null; studentView?: boolean }) {
  const t = useTranslations("assessmentEditor");
  return (
    <ReadOnlyAssessment studentView={studentView}>
      <div className={cn(PAPER, "px-3 py-2 text-[13px] leading-snug")}>
        {item.kind === "exercise" ? (
          <ExerciseView
            exercise={shown(item) as typeof item}
            number={number ?? 0}
            points={item.points !== null ? <span className="font-sans text-[11px] font-semibold">{t("points", { points: item.points })}</span> : undefined}
          />
        ) : (
          <ReadingView item={item} />
        )}
      </div>
    </ReadOnlyAssessment>
  );
}

/**
 * A whole stored assessment, read-only: as the student gets it by default (the community preview), or the teacher
 * view (the moderation queue). The JSON is rendered by the exercise views, never injected as HTML.
 */
export function AssessmentPreview({ content, studentView = true, className }: { content: string; studentView?: boolean; className?: string }) {
  const t = useTranslations("assessmentEditor");
  const doc = useMemo(() => parseAssessment(content), [content]);
  if (!doc || doc.sections.every((s) => s.items.length === 0)) {
    return <p className="text-sm text-muted-foreground">{t("versionPreviewEmpty")}</p>;
  }
  const numbers = exerciseNumbers(doc);
  return (
    <ReadOnlyAssessment studentView={studentView}>
      <div data-assessment-preview className={cn(PAPER, "flex flex-col gap-5 px-4 py-4 text-[14px] sm:px-6", className)}>
        {doc.title && <p className="text-center font-sans text-base font-bold">{doc.title}</p>}
        {doc.sections.map((s) => (
          <section key={s.id} className="flex flex-col gap-3">
            <div className="border-b-2 border-neutral-800 pb-0.5 font-sans text-[13px] font-bold">
              <InlineText value={s.title} />
            </div>
            {s.instructions && <p className="font-sans text-xs italic text-neutral-600"><InlineText value={s.instructions} /></p>}
            {s.items.map((item) =>
              item.kind === "exercise"
                ? <ExerciseView key={item.id} exercise={shown(item) as typeof item} number={numbers.get(item.id) ?? 0} />
                : <ReadingView key={item.id} item={item} />,
            )}
          </section>
        ))}
      </div>
    </ReadOnlyAssessment>
  );
}
