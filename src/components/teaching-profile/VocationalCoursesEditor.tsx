"use client";

import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type { TeachingItem, VocationalUnit } from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { CourseSearchField } from "./CourseSearchField";
import { useCourseSearch } from "./course-search";
import { setUnitItems, toggleUnitItem } from "./teaching-profile-draft";
import { VocationalCourseCard } from "./VocationalCourseCard";

interface VocationalCoursesEditorProps {
  courses: string[];
  /** The whole item list; only the UCs of `courses` are touched. */
  items: TeachingItem[];
  /** Titles already known from a saved profile, used until the catalogue loads. */
  knownTitles?: Record<string, string>;
  onChange: (next: { courses: string[]; items: TeachingItem[] }) => void;
}

/**
 * Pick cursos profissionais and, in each, the UCs the teacher will teach.
 * Shared by the O Meu Ensino card and the onboarding.
 */
export function VocationalCoursesEditor({
  courses,
  items,
  knownTitles = {},
  onChange,
}: VocationalCoursesEditorProps) {
  const t = useTranslations("settings.teachingProfileCard");
  const { catalog, catalogError, term, setTerm, results } = useCourseSearch(t("catalogError"));
  const [unitsByCourse, setUnitsByCourse] = useState<Record<string, VocationalUnit[] | "error">>({});
  const requestedRef = useRef(new Set<string>());

  const loadUnits = useCallback((code: string) => {
    if (requestedRef.current.has(code)) return;
    requestedRef.current.add(code);
    teachingProfileService
      .getUnits(code)
      .then((units) => setUnitsByCourse((current) => ({ ...current, [code]: units })))
      .catch(() => setUnitsByCourse((current) => ({ ...current, [code]: "error" })));
  }, []);

  useEffect(() => {
    courses.forEach(loadUnits);
  }, [courses, loadUnits]);

  const qualificationFor = (code: string) => catalog.find((qualification) => qualification.code === code);

  const addCourse = (code: string) => {
    setTerm("");
    if (!courses.includes(code)) onChange({ courses: [...courses, code], items });
  };

  const removeCourse = (code: string) =>
    onChange({
      courses: courses.filter((existing) => existing !== code),
      items: items.filter((item) => item.qualificationCode !== code),
    });

  return (
    <div className="space-y-4">
      {courses.map((code) => {
        const units = unitsByCourse[code];
        return (
          <VocationalCourseCard
            key={code}
            title={knownTitles[code] ?? qualificationFor(code)?.title ?? code}
            areaLabel={qualificationFor(code)?.cnaefLabel}
            units={units === "error" ? [] : units}
            unitsFailed={units === "error"}
            selectedUnitCodes={
              new Set(
                items
                  .filter((item) => item.qualificationCode === code && item.kind === "unit")
                  .map((item) => item.code)
              )
            }
            onToggleUnit={(unit) => onChange({ courses, items: toggleUnitItem(items, code, unit) })}
            onSetUnits={(courseUnits, selected) =>
              onChange({ courses, items: setUnitItems(items, code, courseUnits, selected) })
            }
            onRemove={() => removeCourse(code)}
          />
        );
      })}

      <div
        className={cn(
          "rounded-xl p-4",
          catalogError
            ? ""
            : courses.length === 0
              ? "border-2 border-dashed border-border"
              : "border border-border bg-muted/40"
        )}
      >
        {!catalogError && (
          <label htmlFor="course-search" className="mb-1 block text-sm font-medium text-foreground">
            {courses.length === 0 ? t("addFirstCourse") : t("addCourse")}
          </label>
        )}
        {!catalogError && courses.length === 0 && (
          <p className="mb-3 text-sm text-muted-foreground">{t("coursesEmpty")}</p>
        )}
        <CourseSearchField
          term={term}
          onTermChange={setTerm}
          catalog={catalog}
          catalogError={catalogError}
          results={results}
          addedCodes={new Set(courses)}
          onSelect={addCourse}
        />
      </div>
    </div>
  );
}
