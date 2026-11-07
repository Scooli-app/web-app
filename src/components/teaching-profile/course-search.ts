import { useCallback, useEffect, useMemo, useState } from "react";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type { Qualification } from "@/shared/types/teaching-profile";
import { normalizeSearch } from "./search";

export interface UseCourseSearchResult {
  /** The full level-4 catalogue, loaded once. Empty while still loading. */
  catalog: Qualification[];
  catalogError: string | null;
  /** True once the catalogue request has succeeded (even if it came back empty). */
  catalogLoaded: boolean;
  /** Clears the error and requests the catalogue again. */
  retryCatalog: () => void;
  term: string;
  setTerm: (term: string) => void;
  /** Local matches for `term`, capped like the Settings course search. */
  results: Qualification[];
  /** True when no course matches every word of `term`, so `results` are the closest courses. */
  partialMatch: boolean;
}

const MAX_RESULTS = 8;
/** Connector words that would match almost every title when only some words have to match. */
const STOPWORDS = new Set(["das", "dos", "para", "com"]);

const words = (value: string): string[] => normalizeSearch(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

const matchesWord = (titleWords: string[], queryWord: string) =>
  titleWords.some((word) => word.startsWith(queryWord));

/**
 * Ranks courses for a search term. Each query word must start a word of the title, so
 * "tecnico de informatica" finds "Técnico/a de Informática - Sistemas" in any word order.
 * Title matches come before code matches, and code matches before CNAEF area matches. Within a
 * rank the shorter title comes first, because the term covers more of it.
 * When no course matches every word, the courses that match the most words come back as a
 * partial match, so a school's own course name still leads to a course in the catalogue.
 */
export function rankCourses(
  catalog: Qualification[],
  term: string
): { results: Qualification[]; partialMatch: boolean } {
  const queryWords = words(term);
  if (queryWords.length === 0) return { results: [], partialMatch: false };
  const key = queryWords.join(" ");

  const scored: { qualification: Qualification; rank: number }[] = [];
  for (const qualification of catalog) {
    const titleWords = words(qualification.title);
    const title = titleWords.join(" ");
    let rank: number | null = null;
    if (title.startsWith(key)) rank = 0;
    else if (queryWords.every((word) => matchesWord(titleWords, word))) rank = 1;
    else if (title.includes(key)) rank = 2;
    else if (normalizeSearch(qualification.code).includes(key)) rank = 3;
    else if (queryWords.every((word) => matchesWord(words(qualification.cnaefLabel ?? ""), word))) rank = 4;
    if (rank !== null) scored.push({ qualification, rank });
  }
  if (scored.length > 0) {
    return {
      results: scored
        .sort((a, b) => a.rank - b.rank || a.qualification.title.length - b.qualification.title.length)
        .slice(0, MAX_RESULTS)
        .map(({ qualification }) => qualification),
      partialMatch: false,
    };
  }

  const meaningful = queryWords.filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  const partial = catalog
    .map((qualification) => {
      const titleWords = words(qualification.title);
      return { qualification, hits: meaningful.filter((word) => matchesWord(titleWords, word)).length };
    })
    .filter(({ hits }) => hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MAX_RESULTS)
    .map(({ qualification }) => qualification);
  return { results: partial, partialMatch: partial.length > 0 };
}

/**
 * Loads the level-4 qualifications catalogue (161 courses) once and filters
 * it locally by search term, so search responds without a round trip per
 * keystroke. Shared by the Settings "O Meu Ensino" course editor and the
 * creation-wizard quick-add dialog so course search behaves identically
 * everywhere a teacher picks a curso profissional.
 */
export function useCourseSearch(catalogErrorFallback: string): UseCourseSearchResult {
  const [catalog, setCatalog] = useState<Qualification[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [term, setTerm] = useState("");

  const retryCatalog = useCallback(() => {
    setCatalogError(null);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    teachingProfileService
      .searchQualifications("", 4, 200)
      .then((results) => {
        if (cancelled) return;
        setCatalog(results);
        setCatalogLoaded(true);
      })
      .catch((error) => {
        // apiClient's interceptor already turns failures into a specific
        // message (backend error, wrong API URL, network) — surface it so a
        // real failure stays diagnosable from the UI.
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : catalogErrorFallback);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [catalogErrorFallback, reloadKey]);

  const { results, partialMatch } = useMemo(() => rankCourses(catalog, term), [catalog, term]);

  return { catalog, catalogError, catalogLoaded, retryCatalog, term, setTerm, results, partialMatch };
}
