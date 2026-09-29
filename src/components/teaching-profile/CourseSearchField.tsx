"use client";

import { Input } from "@/components/ui/input";
import type { Qualification } from "@/shared/types/teaching-profile";
import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface CourseSearchFieldProps {
  inputId?: string;
  term: string;
  onTermChange: (term: string) => void;
  catalog: Qualification[];
  catalogError: string | null;
  results: Qualification[];
  /** Courses already picked — shown with a check mark and disabled. */
  addedCodes: Set<string>;
  onSelect: (code: string) => void;
  /** Disables every result (e.g. while a selection is being saved). */
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * The search input + live results list for picking a curso profissional from
 * the national qualifications catalogue. Shared by the Settings "O Meu
 * Ensino" course editor and the creation-wizard quick-add dialog, so course
 * search looks and behaves identically wherever a teacher meets it.
 */
export function CourseSearchField({
  inputId = "course-search",
  term,
  onTermChange,
  catalog,
  catalogError,
  results,
  addedCodes,
  onSelect,
  disabled = false,
  autoFocus = false,
}: CourseSearchFieldProps) {
  const t = useTranslations("settings.teachingProfileCard");

  if (catalogError) {
    return (
      <div className="rounded-xl bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{catalogError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={inputId}
          value={term}
          onChange={(event) => onTermChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onTermChange("");
          }}
          placeholder={t("coursesSearchPlaceholder")}
          className="bg-background pl-9"
          autoComplete="off"
          autoFocus={autoFocus}
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
              const alreadyAdded = addedCodes.has(qualification.code);
              return (
                <button
                  key={qualification.code}
                  type="button"
                  onClick={() => onSelect(qualification.code)}
                  disabled={alreadyAdded || disabled}
                  className="flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent disabled:opacity-60"
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
  );
}
