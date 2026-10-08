"use client";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import {
  GRADE_GROUPS,
  translateGradeGroupLabel,
  translateGradeLabel,
} from "@/components/document-creation/constants";
import { buildRegularTeachingItems } from "@/components/document-creation/teaching-profile-preferences";
import { EMPTY_TEACHING_PROFILE, type TeachingProfile } from "@/shared/types/teaching-profile";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  GraduationCap,
  Layers,
  Loader2,
  School,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { RegularSubjectsPicker } from "./RegularSubjectsPicker";
import {
  buildProfileForSave,
  deriveTeachingScope,
  modeToScope,
  profileFingerprint,
  schoolYearsForScope,
  scopeToMode,
  TEACHING_PROFILE_ANCHOR,
  type ScopeMode,
  type TeachingScope,
} from "./teaching-profile-draft";
import { VocationalCoursesEditor } from "./VocationalCoursesEditor";

function ProfileBlock({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function TeachingProfileCard() {
  const t = useTranslations("settings.teachingProfileCard");
  const [draft, setDraft] = useState<TeachingProfile>(EMPTY_TEACHING_PROFILE);
  const [scope, setScope] = useState<TeachingScope>({ regular: true, vocational: false });
  const [baseline, setBaseline] = useState<{
    profile: TeachingProfile;
    scope: TeachingScope;
    fingerprint: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const applyBaseline = useCallback((profile: TeachingProfile, nextScope: TeachingScope) => {
    setDraft(profile);
    setScope(nextScope);
    setBaseline({
      profile,
      scope: nextScope,
      fingerprint: profileFingerprint(buildProfileForSave(profile, nextScope)),
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setProfileLoadFailed(false);
    try {
      const loaded = await teachingProfileService.get();
      applyBaseline(loaded, deriveTeachingScope(loaded));
    } catch {
      setProfileLoadFailed(true);
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [applyBaseline, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const profileToSave = useMemo(() => buildProfileForSave(draft, scope), [draft, scope]);
  const isDirty =
    baseline !== null && profileFingerprint(profileToSave) !== baseline.fingerprint;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const visibleYears = useMemo(() => new Set(schoolYearsForScope(scope)), [scope]);
  const visibleGradeGroups = GRADE_GROUPS.map((group) => ({
    groupId: group.groupId,
    grades: group.grades.filter((grade) => visibleYears.has(Number(grade.id))),
  })).filter((group) => group.grades.length > 0);
  const selectedYears = draft.schoolYears.filter((year) => visibleYears.has(year));

  const regularSubjectIds = draft.items
    .filter((item) => item.qualificationCode === null && item.kind === "subject")
    .map((item) => item.code);

  const courseTitles = useMemo(
    () => Object.fromEntries(draft.courseStates.map((state) => [state.code, state.title])),
    [draft.courseStates]
  );

  const scopeMode = scopeToMode(scope);
  const setScopeMode = (mode: ScopeMode) => setScope(modeToScope(mode));

  const toggleSchoolYear = (year: number) =>
    setDraft((current) => ({
      ...current,
      schoolYears: current.schoolYears.includes(year)
        ? current.schoolYears.filter((existing) => existing !== year)
        : [...current.schoolYears, year].sort((a, b) => a - b),
    }));

  const toggleRegularSubject = (subjectId: string) =>
    setDraft((current) => {
      const selected = current.items
        .filter((item) => item.qualificationCode === null && item.kind === "subject")
        .map((item) => item.code);
      const next = selected.includes(subjectId)
        ? selected.filter((id) => id !== subjectId)
        : [...selected, subjectId];
      return {
        ...current,
        items: [
          ...buildRegularTeachingItems(next),
          ...current.items.filter((item) => item.qualificationCode !== null),
        ],
      };
    });

  const handleDiscard = () => {
    if (baseline) applyBaseline(baseline.profile, baseline.scope);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await teachingProfileService.save(profileToSave);
      applyBaseline(saved, scope);
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6 md:p-8">
        <div className="mb-4 h-6 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div
      id={TEACHING_PROFILE_ANCHOR}
      className="scroll-mt-6 rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6 md:p-8"
    >
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t("title")}</h2>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{t("subtitle")}</p>

      {profileLoadFailed && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 p-4"
        >
          <p className="text-sm text-destructive">{t("loadError")}</p>
          <Button type="button" variant="outline" onClick={() => void loadProfile()}>
            {t("retryLoad")}
          </Button>
        </div>
      )}

      <fieldset className="mb-6 space-y-3" disabled={profileLoadFailed}>
        <legend className="mb-3">
          <span className="block font-semibold text-foreground">{t("scopeLabel")}</span>
          <span className="block text-sm text-muted-foreground">{t("scopeHint")}</span>
        </legend>
        <SegmentedControl
          value={scopeMode}
          onChange={setScopeMode}
          ariaLabel={t("modeLabel")}
          options={[
            { value: "regular", label: t("modeRegular"), icon: School },
            { value: "vocational", label: t("modeVocational"), icon: Briefcase },
            { value: "both", label: t("modeBoth"), icon: Layers },
          ]}
        />
      </fieldset>

      <div className="space-y-6">
        <ProfileBlock
            icon={CalendarDays}
            title={t("schoolYearsLabel")}
            description={!scope.regular ? t("schoolYearsVocationalHint") : undefined}
          >
            <div className="space-y-3">
              {visibleGradeGroups.map((group) => (
                <div key={group.groupId} role="group" aria-label={translateGradeGroupLabel(group.groupId)}>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {translateGradeGroupLabel(group.groupId)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.grades.map((grade) => {
                      const year = Number(grade.id);
                      return (
                        <ChoiceChip
                          key={grade.id}
                          selected={selectedYears.includes(year)}
                          showCheck
                          onClick={() => toggleSchoolYear(year)}
                        >
                          {translateGradeLabel(grade.id)}
                        </ChoiceChip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ProfileBlock>

          {scope.regular && (
            <ProfileBlock icon={BookOpen} title={t("regularSubjectsLabel")}>
              <RegularSubjectsPicker
                selectedIds={regularSubjectIds}
                schoolYears={selectedYears}
                onToggle={toggleRegularSubject}
              />
            </ProfileBlock>
          )}

          {scope.vocational && (
            <ProfileBlock
              icon={Briefcase}
              title={t("coursesLabel")}
              description={t("coursesDescription")}
            >
              <VocationalCoursesEditor
                courses={draft.courses}
                items={draft.items}
                knownTitles={courseTitles}
                onChange={({ courses, items }) =>
                  setDraft((current) => ({ ...current, courses, items }))
                }
              />
            </ProfileBlock>
          )}
        </div>

      {isDirty && (
        <div
          role="status"
          className="sticky bottom-4 z-10 mt-6 flex flex-col gap-3 rounded-xl border border-primary/30 bg-card/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:flex-row sm:items-center sm:justify-between sm:pl-4"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            {t("unsavedChanges")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDiscard}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              {t("discard")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-xl sm:flex-none"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isSaving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
