"use client";

import {
  getSubjectsForGrade,
  groupSubjectsByCategory,
  SUBJECTS,
  translateSubjectCategory,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { normalizeSearch } from "./search";

interface RegularSubjectsPickerProps {
  selectedIds: string[];
  /** Years chosen in the profile; the catalogue only offers their subjects. */
  schoolYears: number[];
  onToggle: (subjectId: string) => void;
}

/**
 * Chosen subjects sit on top as removable chips; the catalogue below only
 * offers what isn't chosen yet, filtered to the teacher's years, so a
 * 1.º ciclo teacher never has to scroll past Geometria Descritiva.
 */
export function RegularSubjectsPicker({
  selectedIds,
  schoolYears,
  onToggle,
}: RegularSubjectsPickerProps) {
  const t = useTranslations("settings.teachingProfileCard");
  const [term, setTerm] = useState("");
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(selectedIds.length === 0);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedSubjects = SUBJECTS.filter((subject) => selectedSet.has(subject.id));

  const catalogueGroups = useMemo(() => {
    const availableIds = new Set(
      schoolYears.length > 0
        ? schoolYears.flatMap((year) => getSubjectsForGrade(String(year)).map((s) => s.id))
        : SUBJECTS.map((subject) => subject.id)
    );
    const key = normalizeSearch(term);
    const matching = SUBJECTS.filter(
      (subject) =>
        availableIds.has(subject.id) &&
        !selectedSet.has(subject.id) &&
        (!key ||
          normalizeSearch(translateSubjectLabel(subject.id)).includes(key) ||
          normalizeSearch(subject.label).includes(key))
    );
    return groupSubjectsByCategory(matching);
  }, [schoolYears, selectedSet, term]);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("yourSubjects")}
        </p>
        {selectedSubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSubjectsYet")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedSubjects.map((subject) => {
              const label = translateSubjectLabel(subject.id);
              return (
                <ChoiceChip
                  key={subject.id}
                  selected
                  onClick={() => onToggle(subject.id)}
                  aria-label={t("removeSubject", { subject: label })}
                  trailing={<X className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />}
                >
                  {label}
                </ChoiceChip>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setIsCatalogueOpen((open) => !open)}
          aria-expanded={isCatalogueOpen}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" aria-hidden />
            {t("addSubjects")}
          </span>
          {isCatalogueOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
        </button>

        {isCatalogueOpen && (
          <div className="space-y-4 border-t border-border p-4">
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder={t("subjectsSearchPlaceholder")}
                  aria-label={t("subjectsSearchPlaceholder")}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {schoolYears.length > 0 ? t("subjectsForYears") : t("subjectsAllYears")}
              </p>
            </div>

            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {catalogueGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noSubjectsFound")}</p>
              ) : (
                catalogueGroups.map(({ category, subjects }) => (
                  <div key={category} role="group" aria-label={translateSubjectCategory(category)}>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      {translateSubjectCategory(category)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((subject) => (
                        <ChoiceChip
                          key={subject.id}
                          selected={false}
                          onClick={() => onToggle(subject.id)}
                        >
                          {translateSubjectLabel(subject.id)}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
