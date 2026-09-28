"use client";

import { TEACHING_PROFILE_ANCHOR } from "@/components/teaching-profile/teaching-profile-draft";
import { Card } from "@/components/ui/card";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EducationType } from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { Briefcase, ChevronDown, ChevronUp, GraduationCap, School } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { GRADE_GROUPS, translateGradeGroupLabel, translateGradeLabel } from "../constants";
import {
  VOCATIONAL_SCHOOL_YEARS,
  type VocationalCourseOption,
} from "../teaching-profile-preferences";
import type { FormUpdateFn } from "../types";

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

  return (
    <div className="space-y-3">
      {hasPreferredYears && (
        <div>
          <p className={SECTION_LABEL_CLASS}>{t("myYearsGroupLabel")}</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {GRADE_GROUPS.flatMap((group) => group.grades as readonly { id: string }[])
              .filter((grade) => preferred.has(parseInt(grade.id)))
              .map(renderGrade)}
          </div>
        </div>
      )}

      {hasPreferredYears && (
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

interface ClassSectionProps {
  mode: EducationType;
  onModeChange: (mode: EducationType) => void;
  schoolYear: number;
  preferredSchoolYears: number[];
  onUpdate: FormUpdateFn;
  /** The teacher's saved cursos profissionais; the mode switch only exists when there are some. */
  vocationalCourses: VocationalCourseOption[];
  vocationalCourseCode?: string;
  onCourseChange: (courseCode: string) => void;
  /** Nudge secondary-school teachers without saved courses towards O Meu Ensino. */
  showVocationalHint?: boolean;
  className?: string;
}

/**
 * "Who is this document for": the kind of teaching first, then the year —
 * or, for a curso profissional, the course and its year. Deciding the kind of
 * teaching up front means the subject card next to it never has to switch
 * modes under the teacher's feet.
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
  showVocationalHint = false,
  className,
}: ClassSectionProps) {
  const t = useTranslations("documentCreation.classContext");
  const tGrade = useTranslations("documentCreation.grade");
  const isVocational = mode === "vocational" && vocationalCourses.length > 0;
  const selectedCourse =
    vocationalCourses.find((course) => course.code === vocationalCourseCode) ?? vocationalCourses[0];
  const preferred = new Set(preferredSchoolYears);
  const Icon = isVocational ? Briefcase : GraduationCap;

  return (
    <Card className={cn("p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10 sm:rounded-xl">
            <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {isVocational ? t("titleVocational") : tGrade("title")}{" "}
            <span className="text-destructive">*</span>
          </h2>
        </div>

        {vocationalCourses.length > 0 && (
          <SegmentedControl
            value={isVocational ? "vocational" : "regular"}
            onChange={onModeChange}
            ariaLabel={t("modeLabel")}
            options={[
              { value: "regular", label: t("modeRegular"), icon: School },
              { value: "vocational", label: t("modeVocational"), icon: Briefcase },
            ]}
          />
        )}

        {isVocational && selectedCourse ? (
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
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {VOCATIONAL_SCHOOL_YEARS.map((year) => {
                  const label = translateGradeLabel(String(year));
                  return (
                    <ChoiceChip
                      key={year}
                      selected={schoolYear === year}
                      highlighted={preferred.has(year)}
                      onClick={() => onUpdate("schoolYear", year)}
                      aria-label={tGrade("selectAriaLabel", { grade: label })}
                    >
                      {label}
                    </ChoiceChip>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <YearPicker
            schoolYear={schoolYear}
            preferredSchoolYears={preferredSchoolYears}
            onSelect={(year) => onUpdate("schoolYear", year)}
          />
        )}

        {showVocationalHint && !isVocational && schoolYear >= VOCATIONAL_SCHOOL_YEARS[0] && (
          <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {t("vocationalHint")}{" "}
            <Link
              href={`/settings#${TEACHING_PROFILE_ANCHOR}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("vocationalHintLink")}
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}
