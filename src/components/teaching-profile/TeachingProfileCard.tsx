"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import {
  GRADE_GROUPS,
  SUBJECTS,
  translateGradeGroupLabel,
  translateGradeLabel,
  translateSubjectCategory,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { buildRegularTeachingItems } from "@/components/document-creation/teaching-profile-preferences";
import {
  EMPTY_TEACHING_PROFILE,
  type EducationType,
  type IngestionStatus,
  type Qualification,
  type TeachingItem,
  type TeachingProfile,
  type VocationalUnit,
} from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { Check, GraduationCap, Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/** Strip accents so search matches how the backend and ETL normalise. */
function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Group units by the common prefix before the first dash.
 *
 * In referentials a subject shows up as several units sharing a prefix —
 * "Programação em C/C++ - ciclos e decisões", "… - funções e estruturas". The
 * median is 25 units per course but the maximum is 114, and a flat list that
 * long is hostile. This recovers much of the subject grouping without needing
 * the school's own curriculum plan.
 */
function groupUnits(units: VocationalUnit[]): Array<{ prefix: string; units: VocationalUnit[] }> {
  const groups = new Map<string, VocationalUnit[]>();
  for (const unit of units) {
    const separator = unit.title.indexOf(" - ");
    const prefix = separator > 8 ? unit.title.slice(0, separator) : "";
    const bucket = groups.get(prefix);
    if (bucket) {
      bucket.push(unit);
    } else {
      groups.set(prefix, [unit]);
    }
  }
  // A prefix with a single unit is not a group — those go back to the loose list.
  const loose: VocationalUnit[] = [];
  const real: Array<{ prefix: string; units: VocationalUnit[] }> = [];
  for (const [prefix, bucket] of groups) {
    if (!prefix || bucket.length < 2) {
      loose.push(...bucket);
    } else {
      real.push({ prefix, units: bucket });
    }
  }
  if (loose.length > 0) {
    real.push({ prefix: "", units: loose });
  }
  return real;
}

function StatusBadge({ status }: { status: IngestionStatus }) {
  const t = useTranslations("settings.teachingProfileCard.status");
  const tone =
    status === "indexed"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : status === "failed"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <Badge variant="secondary" className={cn("font-normal", tone)}>
      {status === "pending" || status === "running" ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : null}
      {t(status)}
    </Badge>
  );
}

export function TeachingProfileCard() {
  const t = useTranslations("settings.teachingProfileCard");
  const [profile, setProfile] = useState<TeachingProfile>(EMPTY_TEACHING_PROFILE);
  const [catalog, setCatalog] = useState<Qualification[]>([]);
  const [unitsByCourse, setUnitsByCourse] = useState<Record<string, VocationalUnit[]>>({});
  const [term, setTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const isVocational = profile.educationType === "vocational";

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setProfileLoadFailed(false);
    try {
      const loaded = await teachingProfileService.get();
      setProfile(loaded);
    } catch {
      setProfileLoadFailed(true);
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // The level-4 catalogue is 161 courses: load it once and filter locally so
  // search responds without a round trip per keystroke.
  useEffect(() => {
    if (!isVocational || catalog.length > 0 || catalogError) return;
    let cancelled = false;
    (async () => {
      try {
        const results = await teachingProfileService.searchQualifications("", 4, 200);
        if (!cancelled) setCatalog(results);
      } catch (error) {
        // apiClient's response interceptor already extracts the backend's real
        // error message (or a specific "wrong API URL" / "network error" one) —
        // surface that instead of guessing a single fixed cause. A silent guess
        // here is actively harmful: it looks identical whether the catalogue is
        // genuinely unsynced, the wrong backend is being hit, or the request
        // never left the browser, so a real failure is undiagnosable from the UI.
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : t("catalogError")
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isVocational, catalog.length, catalogError, t]);

  const loadUnits = useCallback(
    async (code: string) => {
      if (unitsByCourse[code]) return;
      try {
        const units = await teachingProfileService.getUnits(code);
        setUnitsByCourse((current) => ({ ...current, [code]: units }));
      } catch {
        toast.error(t("unitsError"));
      }
    },
    [unitsByCourse, t]
  );

  useEffect(() => {
    if (!isVocational) return;
    profile.courses.forEach((code) => void loadUnits(code));
  }, [isVocational, profile.courses, loadUnits]);

  const filtered = useMemo(() => {
    const key = normalize(term);
    if (!key) return catalog.slice(0, 8);
    return catalog
      .filter(
        (q) =>
          normalize(q.title).includes(key) ||
          normalize(q.code).includes(key) ||
          normalize(q.cnaefLabel ?? "").includes(key)
      )
      .slice(0, 8);
  }, [catalog, term]);

  const selectedRegularSubjectIds = useMemo(
    () =>
      new Set(
        profile.items
          .filter((item) => item.kind === "subject" && item.qualificationCode === null)
          .map((item) => item.code)
      ),
    [profile.items]
  );

  const selectedSchoolYears = useMemo(
    () => new Set(profile.schoolYears.filter((year) => year >= 1 && year <= 12)),
    [profile.schoolYears]
  );

  const regularSubjectGroups = useMemo(() => {
    const key = normalize(term);
    const matching = SUBJECTS.filter(
      (subject) =>
        !key ||
        normalize(subject.label).includes(key) ||
        normalize(subject.value).includes(key) ||
        normalize(subject.category).includes(key)
    );

    return matching.reduce<Record<string, typeof SUBJECTS>>((groups, subject) => {
      (groups[subject.category] ??= []).push(subject);
      return groups;
    }, {});
  }, [term]);

  const statusFor = (code: string): IngestionStatus =>
    profile.courseStates.find((c) => c.code === code)?.ingestionStatus ?? "pending";

  const titleFor = (code: string): string =>
    profile.courseStates.find((c) => c.code === code)?.title ??
    catalog.find((q) => q.code === code)?.title ??
    code;

  const setEducationType = (educationType: EducationType) => {
    setTerm("");
    setProfile((current) => ({ ...current, educationType }));
  };

  const addCourse = (code: string) => {
    if (profile.courses.includes(code)) return;
    setProfile((current) => ({ ...current, courses: [...current.courses, code] }));
    setTerm("");
    void loadUnits(code);
  };

  const removeCourse = (code: string) =>
    setProfile((current) => ({
      ...current,
      courses: current.courses.filter((c) => c !== code),
      items: current.items.filter((i) => i.qualificationCode !== code),
    }));

  const toggleUnit = (courseCode: string, unit: VocationalUnit) => {
    const exists = profile.items.some(
      (i) => i.qualificationCode === courseCode && i.code === unit.code
    );
    setProfile((current) => ({
      ...current,
      items: exists
        ? current.items.filter(
            (i) => !(i.qualificationCode === courseCode && i.code === unit.code)
          )
        : [
            ...current.items,
            {
              qualificationCode: courseCode,
              kind: "unit",
              code: unit.code,
              label: unit.title,
              trainingComponent: "technological",
            } satisfies TeachingItem,
          ],
    }));
  };

  const toggleAllUnits = (courseCode: string, units: VocationalUnit[]) => {
    const unitCodes = new Set(units.map((unit) => unit.code));
    const selectedCount = profile.items.filter(
      (item) => item.qualificationCode === courseCode && unitCodes.has(item.code)
    ).length;
    const shouldSelectAll = selectedCount < units.length;

    setProfile((current) => ({
      ...current,
      items: [
        ...current.items.filter(
          (item) => !(item.qualificationCode === courseCode && unitCodes.has(item.code))
        ),
        ...(shouldSelectAll
          ? units.map((unit) => ({
              qualificationCode: courseCode,
              kind: "unit" as const,
              code: unit.code,
              label: unit.title,
              trainingComponent: "technological" as const,
            }))
          : []),
      ],
    }));
  };

  const toggleSchoolYear = (schoolYear: number) => {
    setProfile((current) => {
      const selected = new Set(current.schoolYears);
      if (selected.has(schoolYear)) {
        selected.delete(schoolYear);
      } else {
        selected.add(schoolYear);
      }
      return {
        ...current,
        schoolYears: Array.from(selected).sort((a, b) => a - b),
      };
    });
  };

  const toggleRegularSubject = (subjectId: string) => {
    setProfile((current) => {
      const selectedIds = current.items
        .filter((item) => item.kind === "subject" && item.qualificationCode === null)
        .map((item) => item.code);
      const nextIds = selectedIds.includes(subjectId)
        ? selectedIds.filter((id) => id !== subjectId)
        : [...selectedIds, subjectId];

      return {
        ...current,
        items: [
          ...current.items.filter((item) => item.qualificationCode !== null),
          ...buildRegularTeachingItems(nextIds),
        ],
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const vocationalItems = profile.items.filter((item) => item.qualificationCode !== null);
      const profileToSave: TeachingProfile = {
        ...profile,
        schoolYears: Array.from(selectedSchoolYears).sort((a, b) => a - b),
        items: [...buildRegularTeachingItems([...selectedRegularSubjectIds]), ...vocationalItems],
      };
      const saved = await teachingProfileService.save(profileToSave);
      setProfile(saved);
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card p-4 sm:p-6 md:p-8 rounded-2xl shadow-md border border-border">
        <div className="h-6 bg-muted rounded-lg w-48 animate-pulse mb-4" />
        <div className="h-4 bg-muted rounded-lg w-72 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card p-4 sm:p-6 md:p-8 rounded-2xl shadow-md border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t("title")}</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        {t("subtitle")}
      </p>

      {profileLoadFailed && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 p-4"
        >
          <p className="text-sm text-destructive">{t("loadError")}</p>
          <Button type="button" variant="outline" onClick={() => void loadProfile()}>
            {t("retryLoad")}
          </Button>
        </div>
      )}

      <div className="flex gap-2 mb-6" role="group" aria-label={t("typeGroupLabel")}>
        {(
          [
            ["regular", t("regular")],
            ["vocational", t("vocational")],
          ] as Array<[EducationType, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setEducationType(value)}
            aria-pressed={profile.educationType === value}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
              profile.educationType === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            {profile.educationType === value && (
              <Check className="w-3.5 h-3.5 inline mr-1.5" />
            )}
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">{t("schoolYearsLabel")}</p>
        <div className="space-y-3">
          {GRADE_GROUPS.map((group) => (
            <div key={group.groupId}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {translateGradeGroupLabel(group.groupId)}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.grades.map((grade) => {
                  const year = Number(grade.id);
                  const selected = selectedSchoolYears.has(year);
                  return (
                    <button
                      key={grade.id}
                      type="button"
                      onClick={() => toggleSchoolYear(year)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      )}
                    >
                      {translateGradeLabel(grade.id)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isVocational ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="subject-search"
              className="text-sm font-medium text-foreground mb-2 block"
            >
              {t("subjectsLabel")}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="subject-search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={t("subjectsSearchPlaceholder")}
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div
            className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-border p-3"
            aria-label={t("subjectsListLabel")}
            role="group"
          >
            {Object.entries(regularSubjectGroups).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noSubjectsFound")}</p>
            ) : (
              Object.entries(regularSubjectGroups).map(([category, subjects]) => (
                <fieldset key={category}>
                  <legend className="mb-2 text-xs font-semibold text-muted-foreground">
                    {translateSubjectCategory(category)}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {subjects.map((subject) => (
                      <label
                        key={subject.id}
                        className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          checked={selectedRegularSubjectIds.has(subject.id)}
                          onCheckedChange={() => toggleRegularSubject(subject.id)}
                          className="mt-0.5"
                        />
                        <span className="text-foreground">
                          {translateSubjectLabel(subject.id)}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("subjectsSelected", { count: selectedRegularSubjectIds.size })}
          </p>
        </div>
      ) : catalogError ? (
        <div className="p-4 bg-destructive/10 rounded-xl">
          <p className="text-destructive text-sm">{catalogError}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="course-search"
              className="text-sm font-medium text-foreground mb-2 block"
            >
              {t("coursesLabel")}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="course-search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={t("coursesSearchPlaceholder")}
                className="pl-9"
                autoComplete="off"
              />
            </div>

            {term && (
              <div className="mt-2 border border-border rounded-xl overflow-hidden">
                {filtered.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    {t("noCoursesFound")}
                  </p>
                ) : (
                  filtered.map((qualification) => (
                    <button
                      key={qualification.code}
                      type="button"
                      onClick={() => addCourse(qualification.code)}
                      disabled={profile.courses.includes(qualification.code)}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent disabled:opacity-40 border-b border-border last:border-0"
                    >
                      <span className="block text-sm text-foreground">
                        {qualification.title}
                      </span>
                      <span className="block text-xs text-muted-foreground font-mono">
                        {qualification.code} · {qualification.cnaefLabel}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {profile.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noCoursesYet")}
            </p>
          ) : (
            profile.courses.map((code) => {
              const units = unitsByCourse[code];
              const selected = new Set(
                profile.items
                  .filter((i) => i.qualificationCode === code)
                  .map((i) => i.code)
              );
              return (
                <div key={code} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {titleFor(code)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{code}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={statusFor(code)} />
                      <button
                        type="button"
                        onClick={() => removeCourse(code)}
                        aria-label={t("removeCourse", { course: titleFor(code) })}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">
                    {t("unitsInstruction")}
                  </p>

                  {!units ? (
                    <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mb-3"
                        onClick={() => toggleAllUnits(code, units)}
                      >
                        {selected.size === units.length ? t("deselectAllUnits") : t("selectAllUnits")}
                      </Button>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {groupUnits(units).map((group, index) => (
                        <div key={group.prefix || `loose-${index}`}>
                          {group.prefix && (
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {group.prefix}
                            </p>
                          )}
                          <div className="space-y-1.5">
                            {group.units.map((unit) => (
                              <label
                                key={unit.code}
                                className="flex items-start gap-2.5 text-sm cursor-pointer"
                              >
                                <Checkbox
                                  checked={selected.has(unit.code)}
                                  onCheckedChange={() => toggleUnit(code, unit)}
                                  className="mt-0.5"
                                />
                                <span className="text-foreground">
                                  {unit.title}
                                  <span className="text-muted-foreground font-mono text-xs ml-1.5">
                                    {unit.code}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}

        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={isSaving || profileLoadFailed}
        className="mt-6 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-medium"
      >
        {isSaving ? t("saving") : t("save")}
      </Button>
    </div>
  );
}
