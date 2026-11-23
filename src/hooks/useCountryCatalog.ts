"use client";

import {
  getCountryCatalog,
  gradeOptionsFor,
  subjectIdsForYear,
  type CountryCode,
} from "@/lib/curriculum/countryCatalog";
import {
  translateGradeGroupLabel,
  translateGradeLabel,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { useCountry } from "@/hooks/useCountry";
import { useLocale } from "next-intl";
import { useMemo } from "react";

export interface CatalogYearView {
  value: number;
  label: string;
}

export interface CatalogYearGroupView {
  groupId: string;
  label: string;
  years: CatalogYearView[];
}

export interface CatalogSubjectView {
  id: string;
  label: string;
  value: string;
  category: string;
}

/** A country's school years and subjects, with labels ready for display. */
export interface CountryCatalogView {
  countryCode: CountryCode;
  schoolYears: CatalogYearView[];
  yearGroups: CatalogYearGroupView[];
  subjects: CatalogSubjectView[];
  categoryOrder: string[];
  ambiguousSubjectIds: string[];
  /** Subject ids for a school year; every subject of the country when no year is given. */
  subjectIdsForYear: (year: number | string | null | undefined) => string[];
  /** Finds a subject by its id or its backend value. */
  findSubject: (idOrValue: string) => CatalogSubjectView | undefined;
  subjectLabel: (id: string) => string;
  /** Backend value for a subject id, falling back to the id itself. */
  subjectValue: (id: string) => string;
}

/**
 * Builds the view for a country. Portuguese labels go through the i18n keys so
 * the English interface keeps translating them; Brazilian labels are pt-BR.
 */
export function buildCountryCatalogView(countryCode: CountryCode): CountryCatalogView {
  const catalog = getCountryCatalog(countryCode);
  const isPortugal = catalog.countryCode === "PT";

  const yearLabel = (value: number, fallback: string) =>
    isPortugal ? translateGradeLabel(String(value)) : fallback;

  const yearGroups = catalog.yearGroups.map((group) => ({
    groupId: group.groupId,
    label: isPortugal ? translateGradeGroupLabel(group.groupId) : group.label,
    years: group.years.map((year) => ({
      value: year.value,
      label: yearLabel(year.value, year.label),
    })),
  }));

  const subjects = catalog.subjects.map((subject) => ({
    id: subject.id,
    label: isPortugal ? translateSubjectLabel(subject.id) : subject.label,
    value: subject.value,
    category: subject.category,
  }));

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const subjectByValue = new Map(subjects.map((subject) => [subject.value, subject]));

  return {
    countryCode: catalog.countryCode,
    schoolYears: yearGroups.flatMap((group) => group.years),
    yearGroups,
    subjects,
    categoryOrder: catalog.categoryOrder,
    ambiguousSubjectIds: catalog.ambiguousSubjectIds,
    subjectIdsForYear: (year) => subjectIdsForYear(catalog, year),
    findSubject: (idOrValue) => subjectById.get(idOrValue) ?? subjectByValue.get(idOrValue),
    subjectLabel: (id) => subjectById.get(id)?.label ?? id,
    subjectValue: (id) => subjectById.get(id)?.value ?? id,
  };
}

/** The school years and subjects of the teacher's country, kept in step with the locale. */
export function useCountryCatalog(): CountryCatalogView {
  const countryCode = useCountry();
  const locale = useLocale();
  return useMemo(
    () => buildCountryCatalogView(countryCode),
    // The locale changes the translated Portuguese labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryCode, locale],
  );
}

/** Grade options of the teacher's country (see `gradeOptionsFor`). */
export function useGradeOptions(): { value: string; label: string }[] {
  const countryCode = useCountry();
  return useMemo(() => gradeOptionsFor(countryCode), [countryCode]);
}
