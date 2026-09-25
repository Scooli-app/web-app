import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type { VocationalSchoolSubject } from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { BookOpen, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
  AMBIGUOUS_COMPONENTS_SUBJECTS,
  SUBJECTS,
  translateSubjectCategory,
  translateSubjectLabel,
} from "../constants";
import {
  findVocationalSchoolSubjectCode,
  findVocationalUnitCode,
  type VocationalCourseOption,
} from "../teaching-profile-preferences";
import type { FormUpdateFn } from "../types";

interface SubjectSectionProps {
  subject: string;
  isSpecificComponent?: boolean;
  onUpdate: FormUpdateFn;
  availableSubjects?: string[];
  preferredSubjectIds?: string[];
  /** Saved Ensino Profissional courses/UCs, when the teacher has any. */
  vocationalCourses?: VocationalCourseOption[];
  subjectMode?: "regular" | "vocational";
  vocationalCourseCode?: string;
  className?: string;
  disabled?: boolean;
}

export function SubjectSection({
  subject,
  isSpecificComponent,
  onUpdate,
  availableSubjects,
  preferredSubjectIds = [],
  vocationalCourses = [],
  subjectMode = "regular",
  vocationalCourseCode,
  className,
  disabled,
}: SubjectSectionProps) {
  const t = useTranslations("documentCreation.subject");
  const isVocationalMode = subjectMode === "vocational" && vocationalCourses.length > 0;
  const selectedCourse =
    vocationalCourses.find((course) => course.code === vocationalCourseCode) ??
    vocationalCourses[0];
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  // Sociocultural/científica component subjects (e.g. "Economia", "Psicologia
  // e Sociologia") for the selected course, fetched alongside the existing
  // Componente Técnica (UC) list already carried in `vocationalCourses`.
  // Cached per course code so switching back and forth doesn't refetch.
  const [schoolSubjectsByCourse, setSchoolSubjectsByCourse] = useState<
    Record<string, VocationalSchoolSubject[]>
  >({});
  const [isLoadingSchoolSubjects, setIsLoadingSchoolSubjects] = useState(false);
  const [schoolSubjectsError, setSchoolSubjectsError] = useState<string | null>(null);

  const loadSchoolSubjects = useCallback(
    async (courseCode: string) => {
      if (schoolSubjectsByCourse[courseCode]) return;
      setIsLoadingSchoolSubjects(true);
      setSchoolSubjectsError(null);
      try {
        const subjects = await teachingProfileService.fetchSchoolSubjects(courseCode);
        setSchoolSubjectsByCourse((current) => ({ ...current, [courseCode]: subjects }));
      } catch {
        setSchoolSubjectsError(t("schoolSubjectsError"));
      } finally {
        setIsLoadingSchoolSubjects(false);
      }
    },
    [schoolSubjectsByCourse, t]
  );

  useEffect(() => {
    if (!isVocationalMode || !selectedCourse) return;
    void loadSchoolSubjects(selectedCourse.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVocationalMode, selectedCourse?.code]);

  const schoolSubjects = selectedCourse
    ? schoolSubjectsByCourse[selectedCourse.code] ?? []
    : [];
  const socioculturalSubjects = schoolSubjects.filter(
    (item) => item.component === "sociocultural"
  );
  const cientificaSubjects = schoolSubjects.filter((item) => item.component === "cientifica");

  // Filter subjects based on availableSubjects prop if provided
  const visibleSubjects = availableSubjects
    ? SUBJECTS.filter((s) => availableSubjects.includes(s.id))
    : SUBJECTS;
  const visibleSubjectIds = new Set(visibleSubjects.map((item) => item.id));
  const preferredIds = new Set(
    preferredSubjectIds.filter((id) => visibleSubjectIds.has(id))
  );
  const preferredSubjects = visibleSubjects.filter((item) => preferredIds.has(item.id));
  const remainingSubjects = visibleSubjects.filter((item) => !preferredIds.has(item.id));
  const hasPreferredSubjects = preferredSubjects.length > 0;

  // Group subjects by category
  const groupedSubjects = remainingSubjects.reduce((acc, subject) => {
    const category = subject.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subject);
    return acc;
  }, {} as Record<string, typeof SUBJECTS>);

  // Define category order (optional, to ensure consistent display)
  const categoryOrder = [
    "Disciplinas Gerais",
    "Ciências",
    "Ciências Sociais e Humanas",
    "Línguas",
    "Artes",
    "Literatura",
    "Educação Física",
    "Tecnologia",
    "Cidadania",
    "Religião",
    "Outros",
  ];

  const isAmbiguous = subject && AMBIGUOUS_COMPONENTS_SUBJECTS.includes(subject);

  const handleModeChange = (mode: "regular" | "vocational") => {
    onUpdate("subjectMode", mode);
    onUpdate("subject", "");
    onUpdate("vocationalCourseCode", mode === "vocational" ? selectedCourse?.code : undefined);
    onUpdate("vocationalUnitCode", undefined);
    onUpdate("vocationalSchoolSubjectName", undefined);
    if (mode === "vocational") {
      onUpdate("isSpecificComponent", false);
    }
  };

  const handleCourseChange = (courseCode: string) => {
    onUpdate("vocationalCourseCode", courseCode);
    onUpdate("subject", "");
    onUpdate("vocationalUnitCode", undefined);
    onUpdate("vocationalSchoolSubjectName", undefined);
  };

  const handleUnitChange = (unitLabel: string) => {
    onUpdate("subject", unitLabel);
    onUpdate(
      "vocationalUnitCode",
      selectedCourse ? findVocationalUnitCode(selectedCourse.units, unitLabel) : undefined
    );
    onUpdate("vocationalSchoolSubjectName", undefined);
  };

  const handleSchoolSubjectChange = (subjectName: string) => {
    onUpdate("subject", subjectName);
    onUpdate("vocationalSchoolSubjectName", subjectName);
    onUpdate("vocationalUnitCode", undefined);
  };

  /**
   * The three vocational groups (sociocultural, científica, técnica) share
   * one `<Select>`, so the value picked has to be routed to whichever
   * `handle*Change` owns it. Values are display text (matching the existing
   * UC picker's label-as-value convention), so a school subject is
   * identified by membership in the fetched school-subjects list; anything
   * else is treated as a competence-unit label.
   */
  const handleVocationalSelectChange = (value: string) => {
    const schoolSubjectCode = findVocationalSchoolSubjectCode(
      schoolSubjects.map((item) => ({ subjectCode: item.subjectCode, subjectName: item.subjectName })),
      value
    );
    if (schoolSubjectCode !== undefined) {
      handleSchoolSubjectChange(value);
    } else {
      handleUnitChange(value);
    }
  };

  /**
   * Groups a component's subjects by `groupLabel` for nested display (e.g.
   * several foreign-language options under one "Língua Estrangeira"
   * umbrella). Subjects without a `groupLabel` render individually — never
   * collapsed into a group of their own.
   */
  const groupSchoolSubjectsByLabel = (
    subjects: VocationalSchoolSubject[]
  ): Array<{ groupLabel: string | null; subjects: VocationalSchoolSubject[] }> => {
    const grouped: Array<{ groupLabel: string | null; subjects: VocationalSchoolSubject[] }> = [];
    const groupIndexByLabel = new Map<string, number>();
    for (const item of subjects) {
      if (!item.groupLabel) {
        grouped.push({ groupLabel: null, subjects: [item] });
        continue;
      }
      const existingIndex = groupIndexByLabel.get(item.groupLabel);
      if (existingIndex === undefined) {
        groupIndexByLabel.set(item.groupLabel, grouped.length);
        grouped.push({ groupLabel: item.groupLabel, subjects: [item] });
      } else {
        grouped[existingIndex].subjects.push(item);
      }
    }
    return grouped;
  };

  return (
    <Card
      className={cn(
        "p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow",
        className
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {t("title")} <span className="text-destructive">*</span>
            </h2>
          </div>

          {isAmbiguous && !isVocationalMode && !disabled && (
            <div className="flex items-center bg-muted p-1 rounded-lg self-start sm:self-center">
              <button
                type="button"
                onClick={() => onUpdate("isSpecificComponent", false)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                  !isSpecificComponent
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {!isSpecificComponent && <Check className="w-3 h-3" />}
                {t("generalTraining")}
              </button>
              <button
                type="button"
                onClick={() => onUpdate("isSpecificComponent", true)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                  isSpecificComponent
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isSpecificComponent && <Check className="w-3 h-3" />}
                {t("specificTraining")}
              </button>
            </div>
          )}
        </div>

        {vocationalCourses.length > 0 && !disabled && (
          <div
            className="flex items-center bg-muted p-1 rounded-lg w-fit"
            role="group"
            aria-label={t("modeGroupLabel")}
          >
            <button
              type="button"
              onClick={() => handleModeChange("regular")}
              aria-pressed={!isVocationalMode}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                !isVocationalMode
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {!isVocationalMode && <Check className="w-3 h-3" />}
              {t("modeRegular")}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("vocational")}
              aria-pressed={isVocationalMode}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                isVocationalMode
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isVocationalMode && <Check className="w-3 h-3" />}
              {t("modeVocational")}
            </button>
          </div>
        )}

        {!isVocationalMode && preferredSubjects.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("yourSubjects")}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {preferredSubjects.map((subjectOption) => {
                const isSelected = subject === subjectOption.id;
                return (
                  <button
                    key={subjectOption.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onUpdate("subject", isSelected ? "" : subjectOption.id)}
                    className={cn(
                      "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all",
                      "border hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                        : "bg-primary/10 text-primary border-primary/40 hover:border-primary hover:bg-primary/15"
                    )}
                    aria-pressed={isSelected}
                  >
                    {translateSubjectLabel(subjectOption.id)}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowAllSubjects((current) => !current)}
                className={cn(
                  "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all",
                  "border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary",
                  "flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
                )}
                aria-expanded={showAllSubjects}
              >
                {showAllSubjects ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {t("showAllSubjects")}
              </button>
            </div>
          </div>
        )}

        {isVocationalMode ? (
          <div className="space-y-3">
            <Select
              value={selectedCourse?.code ?? ""}
              onValueChange={handleCourseChange}
              disabled={disabled}
            >
              <SelectTrigger
                className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-background border-border rounded-xl"
                aria-label={t("courseSelectAriaLabel")}
              >
                <SelectValue placeholder={t("coursePlaceholder")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border max-h-[400px]">
                {vocationalCourses.map((course) => (
                  <SelectItem
                    key={course.code}
                    value={course.code}
                    className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary"
                  >
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {schoolSubjectsError && (
              <p className="text-xs text-destructive">{schoolSubjectsError}</p>
            )}

            <Select
              value={subject}
              onValueChange={handleVocationalSelectChange}
              disabled={disabled || !selectedCourse || isLoadingSchoolSubjects}
            >
              <SelectTrigger
                className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-background border-border rounded-xl"
                aria-label={t("vocationalComponentSelectAriaLabel")}
              >
                <SelectValue
                  placeholder={
                    isLoadingSchoolSubjects
                      ? t("schoolSubjectsLoading")
                      : t("vocationalComponentPlaceholder")
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border max-h-[400px]">
                {socioculturalSubjects.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="bg-background px-2 py-2 text-sm font-bold text-primary border-b border-border/50 rounded-lg mb-1">
                      {t("componentSociocultural")}
                    </SelectLabel>
                    {groupSchoolSubjectsByLabel(socioculturalSubjects).map((entry) =>
                      entry.groupLabel ? (
                        <SelectGroup key={entry.groupLabel}>
                          <SelectLabel className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                            {entry.groupLabel}
                          </SelectLabel>
                          {entry.subjects.map((subjectOption) => (
                            <SelectItem
                              key={subjectOption.subjectCode}
                              value={subjectOption.subjectName}
                              className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-6"
                            >
                              {subjectOption.subjectName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : (
                        entry.subjects.map((subjectOption) => (
                          <SelectItem
                            key={subjectOption.subjectCode}
                            value={subjectOption.subjectName}
                            className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-4"
                          >
                            {subjectOption.subjectName}
                          </SelectItem>
                        ))
                      )
                    )}
                  </SelectGroup>
                )}

                {cientificaSubjects.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="bg-background px-2 py-2 text-sm font-bold text-primary border-b border-border/50 rounded-lg mb-1">
                      {t("componentCientifica")}
                    </SelectLabel>
                    {groupSchoolSubjectsByLabel(cientificaSubjects).map((entry) =>
                      entry.groupLabel ? (
                        <SelectGroup key={entry.groupLabel}>
                          <SelectLabel className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                            {entry.groupLabel}
                          </SelectLabel>
                          {entry.subjects.map((subjectOption) => (
                            <SelectItem
                              key={subjectOption.subjectCode}
                              value={subjectOption.subjectName}
                              className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-6"
                            >
                              {subjectOption.subjectName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : (
                        entry.subjects.map((subjectOption) => (
                          <SelectItem
                            key={subjectOption.subjectCode}
                            value={subjectOption.subjectName}
                            className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-4"
                          >
                            {subjectOption.subjectName}
                          </SelectItem>
                        ))
                      )
                    )}
                  </SelectGroup>
                )}

                {(selectedCourse?.units.length ?? 0) > 0 && (
                  <SelectGroup>
                    <SelectLabel className="bg-background px-2 py-2 text-sm font-bold text-primary border-b border-border/50 rounded-lg mb-1">
                      {t("componentTecnica")}
                    </SelectLabel>
                    {selectedCourse?.units.map((unit) => (
                      <SelectItem
                        key={unit.code}
                        value={unit.label}
                        className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-4"
                      >
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          (!hasPreferredSubjects || showAllSubjects || (subject && !preferredIds.has(subject))) && (
            <Select
              value={subject}
              onValueChange={(value) => onUpdate("subject", value)}
              disabled={disabled}
            >
              <SelectTrigger
                className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-background border-border rounded-xl"
                aria-label={t("selectAriaLabel")}
              >
                <SelectValue
                  placeholder={
                    disabled
                      ? t("placeholderDisabled")
                      : t("placeholder")
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border max-h-[400px]">
                {categoryOrder.map((category) => {
                  const categorySubjects = groupedSubjects[category];
                  if (!categorySubjects?.length) return null;

                  return (
                    <SelectGroup key={category}>
                      <SelectLabel className="bg-background px-2 py-2 text-sm font-bold text-primary border-b border-border/50 rounded-lg mb-1">
                        {translateSubjectCategory(category)}
                      </SelectLabel>
                      {categorySubjects.map((subjectOption) => (
                        <SelectItem
                          key={subjectOption.id}
                          value={subjectOption.id}
                          className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-4"
                        >
                          {translateSubjectLabel(subjectOption.id)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
                {Object.keys(groupedSubjects)
                  .filter((c) => !categoryOrder.includes(c))
                  .map((category) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="bg-background px-2 py-2 text-sm font-bold text-primary border-b border-border/50 mb-1">
                        {translateSubjectCategory(category)}
                      </SelectLabel>
                      {groupedSubjects[category].map((subjectOption) => (
                        <SelectItem
                          key={subjectOption.id}
                          value={subjectOption.id}
                          className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-4"
                        >
                          {translateSubjectLabel(subjectOption.id)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
              </SelectContent>
            </Select>
          )
        )}
      </div>
    </Card>
  );
}
