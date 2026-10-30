"use client";

import { Card } from "@/components/ui/card";
import { ChoiceChip } from "@/components/ui/choice-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EducationType, TeachingProfile } from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GRADE_GROUPS, translateGradeGroupLabel, translateGradeLabel } from "../constants";
import {
  VOCATIONAL_SCHOOL_YEARS,
  getDefaultVocationalSchoolYear,
  type VocationalCourseOption,
} from "../teaching-profile-preferences";
import type { SubjectChoiceUpdateFn } from "../useSubjectChoice";
import { FieldHeading } from "./FormCard";
import { QuickAddVocationalCourseDialog } from "./QuickAddVocationalCourseDialog";

const SECTION_LABEL_CLASS =
  "mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:mb-2 sm:text-xs";

interface YearPickerProps {
  schoolYear: number;
  preferredSchoolYears: number[];
  onSelect: (year: number) => void;
}

/** Regular-education years: the teacher's own years first, the rest on demand. */
function YearPicker({ schoolYear, preferredSchoolYears, onSelect }: YearPickerProps) {
  const t = useTranslations("documentCreation.grade");
  const preferred = new Set(preferredSchoolYears);
  const hasPreferredYears = preferred.size > 0;
  // `null` follows the profile, which loads after mount: collapsed once the
  // teacher has saved years — unless the active year is outside them, which
  // is never hidden behind a toggle.
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const showAllYears =
    expanded ?? (!hasPreferredYears || (schoolYear > 0 && !preferred.has(schoolYear)));

  const renderGrade = (grade: { id: string }) => {
    const year = parseInt(grade.id);
    const isSelected = schoolYear === year;
    const label = translateGradeLabel(grade.id);
    return (
      <ChoiceChip
        key={grade.id}
        selected={isSelected}
        highlighted={preferred.has(year)}
        onClick={() => onSelect(isSelected ? 0 : year)}
        aria-label={t("selectAriaLabel", { grade: label })}
      >
        {label}
      </ChoiceChip>
    );
  };

  const toggleClass =
    "flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground";

  // The teacher's own years in one row, the "other years" switch as its last item.
  return (
    <div className="space-y-2.5">
      {hasPreferredYears && (
        <div className="flex flex-wrap items-center gap-1.5">
          {GRADE_GROUPS.flatMap((group) => group.grades as readonly { id: string }[])
            .filter((grade) => preferred.has(parseInt(grade.id)))
            .map(renderGrade)}
          <button
            type="button"
            onClick={() => setExpanded(!showAllYears)}
            aria-expanded={showAllYears}
            className={toggleClass}
          >
            {showAllYears ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
            {showAllYears ? t("hideOtherYears") : t("showOtherYears")}
          </button>
        </div>
      )}

      {showAllYears && (
        <div className="space-y-2.5 sm:space-y-3">
          {GRADE_GROUPS.map((group) => (
            <div key={group.groupId}>
              <p className={SECTION_LABEL_CLASS}>{translateGradeGroupLabel(group.groupId)}</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">{group.grades.map(renderGrade)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface VocationalYearPickerProps {
  schoolYear: number;
  preferredSchoolYears: number[];
  onSelect: (year: number) => void;
}

/**
 * Cursos profissionais only run 10.º–12.º ano, so there is nothing to group
 * or progressively disclose — but the label, spacing and "os teus anos"-style
 * highlighting mirror YearPicker exactly so the two never feel like separate
 * components bolted together.
 */
function VocationalYearPicker({ schoolYear, preferredSchoolYears, onSelect }: VocationalYearPickerProps) {
  const t = useTranslations("documentCreation.grade");
  const preferred = new Set(preferredSchoolYears);
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {VOCATIONAL_SCHOOL_YEARS.map((year) => {
        const label = translateGradeLabel(String(year));
        return (
          <ChoiceChip
            key={year}
            selected={schoolYear === year}
            highlighted={preferred.has(year)}
            onClick={() => onSelect(year)}
            aria-label={t("selectAriaLabel", { grade: label })}
          >
            {label}
          </ChoiceChip>
        );
      })}
    </div>
  );
}

interface ClassSectionProps {
  mode: EducationType;
  onModeChange: (mode: EducationType) => void;
  schoolYear: number;
  preferredSchoolYears: number[];
  onUpdate: SubjectChoiceUpdateFn;
  /** The teacher's saved cursos profissionais. May be empty — the mode switch
   * always renders regardless, so a first-time técnico teacher can reach it. */
  vocationalCourses: VocationalCourseOption[];
  vocationalCourseCode?: string;
  onCourseChange: (courseCode: string) => void;
  /**
   * Called once a course is added through the quick-add dialog and the
   * teacher's profile is saved, with the freshly saved profile — the caller
   * re-derives vocational course options from it (see
   * getVocationalCourseOptions) so the new course appears immediately.
   */
  onVocationalCourseAdded: (profile: TeachingProfile) => void;
  /** Gates the whole vocational surface (mode switch, quick-add, course/UC
   * pickers) behind the `teacher_profile` feature flag. When false, this
   * renders the plain pre-feature regular-year picker only — no switch, no
   * vocational path reachable, regardless of what the caller passes for
   * `mode`/`vocationalCourses`. */
  isVocationalFeatureEnabled: boolean;
  className?: string;
}

/**
 * "Who is this document for": the kind of teaching first, then the year —
 * or, for a curso profissional, the course and its year. Deciding the kind of
 * teaching up front means the subject card next to it never has to switch
 * modes under the teacher's feet.
 *
 * The Ensino regular/Curso profissional switch always renders when the
 * `teacher_profile` feature flag is on, even for a teacher with zero saved
 * vocational courses: tapping "Curso profissional" with nothing saved opens a
 * quick-add dialog right here instead of a dead-end hint pointing at
 * Settings. When the flag is off, none of that renders — this falls back to
 * the plain regular-year picker only.
 */
export function ClassSection({
  mode,
  onModeChange,
  schoolYear,
  preferredSchoolYears,
  onUpdate,
  vocationalCourses,
  vocationalCourseCode,
  onCourseChange,
  onVocationalCourseAdded,
  isVocationalFeatureEnabled,
  className,
}: ClassSectionProps) {
  const t = useTranslations("documentCreation.classContext");
  const tGrade = useTranslations("documentCreation.grade");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const isVocational = mode === "vocational" && vocationalCourses.length > 0;
  const selectedCourse =
    vocationalCourses.find((course) => course.code === vocationalCourseCode) ?? vocationalCourses[0];

  const handleModeChange = (nextMode: EducationType) => {
    if (nextMode === "vocational" && vocationalCourses.length === 0) {
      setIsQuickAddOpen(true);
      return;
    }
    onModeChange(nextMode);
  };

  return (
    <Card className={cn("gap-0 border-border p-3 py-3 shadow-sm sm:p-4", className)}>
      <div className="space-y-3">
        <FieldHeading
          title={isVocational ? t("titleVocational") : tGrade("title")}
          required
          aside={
            isVocationalFeatureEnabled ? (
              // The kind of teaching as a small switch beside the heading, not a full-width bar.
              <div className="flex shrink-0 rounded-md border border-border p-0.5 text-xs" role="radiogroup" aria-label={t("modeLabel")}>
                {(["regular", "vocational"] as const).map((value) => {
                  const active = (isVocational ? "vocational" : "regular") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleModeChange(value)}
                      className={cn(
                        "rounded px-2 py-0.5 font-medium transition-colors",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {value === "regular" ? t("modeRegular") : t("modeVocational")}
                    </button>
                  );
                })}
              </div>
            ) : undefined
          }
        />

        {isVocationalFeatureEnabled && isVocational && selectedCourse ? (
          <div className="space-y-4">
            <div>
              <p className={SECTION_LABEL_CLASS}>{t("courseLabel")}</p>
              {vocationalCourses.length === 1 ? (
                <p className="rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground">
                  {selectedCourse.title}
                </p>
              ) : (
                <Select value={selectedCourse.code} onValueChange={onCourseChange}>
                  <SelectTrigger
                    className="h-11 rounded-xl border-border bg-background px-4 text-sm"
                    aria-label={t("courseSelectAriaLabel")}
                  >
                    <SelectValue placeholder={t("coursePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px] rounded-xl border-border">
                    {vocationalCourses.map((course) => (
                      <SelectItem
                        key={course.code}
                        value={course.code}
                        className="cursor-pointer rounded-lg px-3 py-2.5 text-sm focus:bg-accent focus:text-primary"
                      >
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <p className={SECTION_LABEL_CLASS}>{t("yearLabel")}</p>
              <VocationalYearPicker
                schoolYear={schoolYear}
                preferredSchoolYears={preferredSchoolYears}
                onSelect={(year) => onUpdate("schoolYear", year)}
              />
            </div>
          </div>
        ) : (
          <YearPicker
            schoolYear={schoolYear}
            preferredSchoolYears={preferredSchoolYears}
            onSelect={(year) => onUpdate("schoolYear", year)}
          />
        )}
      </div>

      {isVocationalFeatureEnabled && (
        <QuickAddVocationalCourseDialog
          open={isQuickAddOpen}
          onOpenChange={setIsQuickAddOpen}
          onCourseAdded={(profile: TeachingProfile, courseCode: string) => {
            onVocationalCourseAdded(profile);
            onCourseChange(courseCode);
            onModeChange("vocational");
            if (!(VOCATIONAL_SCHOOL_YEARS as readonly number[]).includes(schoolYear)) {
              onUpdate("schoolYear", getDefaultVocationalSchoolYear(preferredSchoolYears));
            }
          }}
        />
      )}
    </Card>
  );
}
