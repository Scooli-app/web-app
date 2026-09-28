"use client";

import { Input } from "@/components/ui/input";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type {
  Qualification,
  TeachingItem,
  VocationalUnit,
} from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeSearch } from "./search";
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
  const [catalog, setCatalog] = useState<Qualification[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [unitsByCourse, setUnitsByCourse] = useState<Record<string, VocationalUnit[] | "error">>({});
  const [term, setTerm] = useState("");
  const requestedRef = useRef(new Set<string>());

  // The level-4 catalogue is 161 courses: load it once and filter locally so
  // search responds without a round trip per keystroke.
  useEffect(() => {
    let cancelled = false;
    teachingProfileService
      .searchQualifications("", 4, 200)
      .then((results) => {
        if (!cancelled) setCatalog(results);
      })
      .catch((error) => {
        // apiClient's interceptor already turns failures into a specific
        // message (backend error, wrong API URL, network) — surface it so a
        // real failure stays diagnosable from the UI.
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : t("catalogError"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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

  const results = useMemo(() => {
    const key = normalizeSearch(term);
    if (!key) return [];
    return catalog
      .filter(
        (qualification) =>
          normalizeSearch(qualification.title).includes(key) ||
          normalizeSearch(qualification.code).includes(key) ||
          normalizeSearch(qualification.cnaefLabel ?? "").includes(key)
      )
      .slice(0, 8);
  }, [catalog, term]);

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

      {catalogError ? (
        <div className="rounded-xl bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{catalogError}</p>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl p-4",
            courses.length === 0
              ? "border-2 border-dashed border-border"
              : "border border-border bg-muted/40"
          )}
        >
          <label htmlFor="course-search" className="mb-1 block text-sm font-medium text-foreground">
            {courses.length === 0 ? t("addFirstCourse") : t("addCourse")}
          </label>
          {courses.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">{t("coursesEmpty")}</p>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="course-search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setTerm("");
              }}
              placeholder={t("coursesSearchPlaceholder")}
              className="bg-background pl-9"
              autoComplete="off"
            />
          </div>

          {term.trim() && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border bg-background">
              {catalog.length === 0 ? (
                <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("coursesLoading")}
                </p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{t("noCoursesFound")}</p>
              ) : (
                results.map((qualification) => {
                  const alreadyAdded = courses.includes(qualification.code);
                  return (
                    <button
                      key={qualification.code}
                      type="button"
                      onClick={() => addCourse(qualification.code)}
                      disabled={alreadyAdded}
                      className="flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground">{qualification.title}</span>
                        {qualification.cnaefLabel && (
                          <span className="block text-xs text-muted-foreground">
                            {qualification.cnaefLabel}
                          </span>
                        )}
                      </span>
                      {alreadyAdded && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          {t("courseAdded")}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
