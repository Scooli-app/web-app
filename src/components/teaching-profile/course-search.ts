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

  return { catalog, catalogError, catalogLoaded, retryCatalog, term, setTerm, results };
}
