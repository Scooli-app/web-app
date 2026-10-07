import { Card } from "@/components/ui/card";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
import type {
  EducationType,
  VocationalSchoolSubject,
  VocationalUnit,
} from "@/shared/types/teaching-profile";
import { cn } from "@/shared/utils/utils";
import { BookOpen, ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  AMBIGUOUS_COMPONENTS_SUBJECTS,
  SUBJECT_CATEGORY_ORDER,
  SUBJECTS,
  translateSubjectCategory,
  translateSubjectLabel,
} from "../constants";
import type { VocationalCourseOption } from "../teaching-profile-preferences";
import type { SubjectChoiceUpdateFn } from "../useSubjectChoice";

const SECTION_LABEL_CLASS =
  "mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:mb-2 sm:text-xs";
const SELECT_TRIGGER_CLASS =
  "h-11 sm:h-12 px-4 text-sm sm:text-base bg-background border-border rounded-xl";
const SELECT_ITEM_CLASS =
  "py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary";
const SELECT_GROUP_LABEL_CLASS =
  "bg-background px-2 py-2 text-sm font-bold text-primary border-b border-border/50 rounded-lg mb-1";

/** A course's full sociocultural/científica subject list and tecnológica UCs. */
type CourseCatalogue =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; subjects: VocationalSchoolSubject[]; units: VocationalUnit[] };

/**
 * Loads a course's full catalogue on demand — only when the teacher asks to see
 * more than what they saved in their profile. Cached per course.
 */
function useCourseCatalogue(courseCode: string | undefined, enabled: boolean) {
  const [byCourse, setByCourse] = useState<Record<string, CourseCatalogue>>({});

  useEffect(() => {
    if (!enabled || !courseCode || byCourse[courseCode]) return;
    setByCourse((current) => ({ ...current, [courseCode]: { status: "loading" } }));
    void Promise.allSettled([
      teachingProfileService.fetchSchoolSubjects(courseCode),
      teachingProfileService.getUnits(courseCode),
    ]).then(([subjects, units]) => {
      const entry: CourseCatalogue =
        subjects.status === "rejected" && units.status === "rejected"
          ? { status: "error" }
          : {
              status: "ready",
              subjects: subjects.status === "fulfilled" ? subjects.value : [],
              units: units.status === "fulfilled" ? units.value : [],
            };
      setByCourse((current) => ({ ...current, [courseCode]: entry }));
    });
  }, [enabled, courseCode, byCourse]);

  return courseCode ? byCourse[courseCode] : undefined;
}

/**
 * Nests variant subjects under their umbrella label (e.g. several foreign
 * languages under "Língua Estrangeira"). Subjects without a `groupLabel`
 * render individually — never collapsed into a group of their own.
 */
function groupSchoolSubjectsByLabel(
  subjects: VocationalSchoolSubject[]
): Array<{ groupLabel: string | null; subjects: VocationalSchoolSubject[] }> {
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
}

// Select values carry their kind, so a subject and a UC that happen to share a
// name can never be confused.
const subjectKey = (name: string) => `subject:${name}`;
const unitKey = (code: string) => `unit:${code}`;
const classKey = (id: string) => `class:${id}`;

interface SubjectSectionProps {
  subject: string;
  isSpecificComponent?: boolean;
  onUpdate: SubjectChoiceUpdateFn;
  availableSubjects?: string[];
  preferredSubjectIds?: string[];
  mode?: EducationType;
  /** The curso profissional chosen in the class card, in vocational mode. */
  vocationalCourse?: VocationalCourseOption;
  vocationalUnitCode?: string;
  vocationalSchoolSubjectName?: string;
  /** Teacher-defined vocational class (SCOOL-154) selected instead of a UC. */
  vocationalClassId?: string;
  className?: string;
  disabled?: boolean;
}

export function SubjectSection({
  subject,
  isSpecificComponent,
  onUpdate,
  availableSubjects,
  preferredSubjectIds = [],
  mode = "regular",
  vocationalCourse,
  vocationalUnitCode,
  vocationalSchoolSubjectName,
  vocationalClassId,
  className,
  disabled,
}: SubjectSectionProps) {
  const t = useTranslations("documentCreation.subject");
  const isVocational = mode === "vocational" && !!vocationalCourse;
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [showAllVocational, setShowAllVocational] = useState(false);

  // ---- Regular ----------------------------------------------------------
  const visibleSubjects = availableSubjects
    ? SUBJECTS.filter((s) => availableSubjects.includes(s.id))
    : SUBJECTS;
  const visibleSubjectIds = new Set(visibleSubjects.map((item) => item.id));
  const preferredIds = new Set(preferredSubjectIds.filter((id) => visibleSubjectIds.has(id)));
  const preferredSubjects = visibleSubjects.filter((item) => preferredIds.has(item.id));
  const remainingSubjects = visibleSubjects.filter((item) => !preferredIds.has(item.id));
  const hasPreferredSubjects = preferredSubjects.length > 0;

  const groupedSubjects = remainingSubjects.reduce<Record<string, typeof SUBJECTS>>(
    (acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    },
    {}
  );
  const categories = [
    ...SUBJECT_CATEGORY_ORDER,
    ...Object.keys(groupedSubjects).filter((c) => !SUBJECT_CATEGORY_ORDER.includes(c)),
  ];

  const isAmbiguous = !!subject && AMBIGUOUS_COMPONENTS_SUBJECTS.includes(subject);
  const showRegularSelect =
    !hasPreferredSubjects || showAllSubjects || (!!subject && !preferredIds.has(subject));

  // ---- Vocational -------------------------------------------------------
  // The UCs the teacher picked in their profile come first as one-tap chips;
  // the course's full catalogue (school subjects included) is one click away.
  const savedUnits = vocationalCourse?.units ?? [];
  const hasSavedUnits = savedUnits.length > 0;
  // Teacher-defined classes (SCOOL-154) group some of those UCs — shown
  // alongside them as an alternative, coarser-grained choice.
  const vocationalClasses = vocationalCourse?.classes ?? [];
  const hasVocationalClasses = vocationalClasses.length > 0;

  const selectedVocationalKey = vocationalClassId
    ? classKey(vocationalClassId)
    : vocationalUnitCode
      ? unitKey(vocationalUnitCode)
      : vocationalSchoolSubjectName
        ? subjectKey(vocationalSchoolSubjectName)
        : "";
  const showVocationalSelect =
    !hasSavedUnits ||
    showAllVocational ||
    (!!selectedVocationalKey && !savedUnits.some((unit) => unitKey(unit.code) === selectedVocationalKey));

  const catalogue = useCourseCatalogue(vocationalCourse?.code, isVocational && showVocationalSelect);

  const selectUnit = (code: string, label: string) => {
    const isSelected = vocationalUnitCode === code;
    onUpdate("subject", isSelected ? "" : label);
    onUpdate("vocationalUnitCode", isSelected ? undefined : code);
    onUpdate("vocationalSchoolSubjectName", undefined);
    onUpdate("vocationalClassId", undefined);
  };

  const selectClass = (id: string, name: string) => {
    const isSelected = vocationalClassId === id;
    onUpdate("subject", isSelected ? "" : name);
    onUpdate("vocationalClassId", isSelected ? undefined : id);
    onUpdate("vocationalUnitCode", undefined);
    onUpdate("vocationalSchoolSubjectName", undefined);
  };

  const handleVocationalSelect = (value: string) => {
    if (value.startsWith("unit:")) {
      const code = value.slice("unit:".length);
      const unit =
        catalogue?.status === "ready" ? catalogue.units.find((item) => item.code === code) : undefined;
      const label = unit?.title ?? savedUnits.find((item) => item.code === code)?.label ?? "";
      onUpdate("subject", label);
      onUpdate("vocationalUnitCode", code);
      onUpdate("vocationalSchoolSubjectName", undefined);
      onUpdate("vocationalClassId", undefined);
    } else {
      const name = value.slice("subject:".length);
      onUpdate("subject", name);
      onUpdate("vocationalSchoolSubjectName", name);
      onUpdate("vocationalUnitCode", undefined);
      onUpdate("vocationalClassId", undefined);
    }
  };

  const renderSchoolSubjectItems = (subjects: VocationalSchoolSubject[]) =>
    groupSchoolSubjectsByLabel(subjects).map((entry) =>
      entry.groupLabel ? (
        <SelectGroup key={entry.groupLabel}>
          <SelectLabel className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {entry.groupLabel}
          </SelectLabel>
          {entry.subjects.map((item) => (
            <SelectItem key={item.subjectCode} value={subjectKey(item.subjectName)} className={cn(SELECT_ITEM_CLASS, "pl-6")}>
              {item.subjectName}
            </SelectItem>
          ))}
        </SelectGroup>
      ) : (
        entry.subjects.map((item) => (
          <SelectItem key={item.subjectCode} value={subjectKey(item.subjectName)} className={cn(SELECT_ITEM_CLASS, "pl-4")}>
            {item.subjectName}
          </SelectItem>
        ))
      )
    );

  const showMoreToggle = (expanded: boolean, onToggle: () => void, label: string) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "flex min-h-8 items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors sm:min-h-9 sm:px-3 sm:text-sm",
        "hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </button>
  );

  const renderVocational = () => {
    const isLoadingCatalogue = catalogue?.status === "loading" || (showVocationalSelect && !catalogue);
    const socioculturalOptions =
      catalogue?.status === "ready" ? catalogue.subjects.filter((item) => item.component === "sociocultural") : [];
    const scientificOptions =
      catalogue?.status === "ready" ? catalogue.subjects.filter((item) => item.component === "cientifica") : [];
    const unitOptions = catalogue?.status === "ready" ? catalogue.units : [];

    return (
      <div className="space-y-3">
        {hasVocationalClasses && (
          <div role="group" aria-label={t("yourClasses")}>
            <p className={SECTION_LABEL_CLASS}>{t("yourClasses")}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {vocationalClasses.map((vocClass) => (
                <ChoiceChip
                  key={vocClass.id}
                  selected={selectedVocationalKey === classKey(vocClass.id)}
                  highlighted
                  disabled={disabled}
                  onClick={() => selectClass(vocClass.id, vocClass.name)}
                >
                  <Users className="h-3 w-3 shrink-0" aria-hidden />
                  {vocClass.name}
                </ChoiceChip>
              ))}
            </div>
          </div>
        )}

        {hasSavedUnits && (
          <div role="group" aria-label={t("yourUnits")}>
            <p className={SECTION_LABEL_CLASS}>{t("yourUnits")}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {savedUnits.map((unit) => (
                <ChoiceChip
                  key={unit.code}
                  selected={selectedVocationalKey === unitKey(unit.code)}
                  highlighted
                  disabled={disabled}
                  onClick={() => selectUnit(unit.code, unit.label)}
                >
                  {unit.label}
                </ChoiceChip>
              ))}
              {showMoreToggle(showAllVocational, () => setShowAllVocational((current) => !current), t("showAllVocational"))}
            </div>
          </div>
        )}

        {showVocationalSelect && (
          <>
            {catalogue?.status === "error" && (
              <p className="text-xs text-destructive">{t("schoolSubjectsError")}</p>
            )}
            <Select
              value={selectedVocationalKey}
              onValueChange={handleVocationalSelect}
              disabled={disabled || isLoadingCatalogue || catalogue?.status === "error"}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS} aria-label={t("vocationalComponentSelectAriaLabel")}>
                {isLoadingCatalogue ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t("schoolSubjectsLoading")}
                  </span>
                ) : (
                  <SelectValue placeholder={t("vocationalComponentPlaceholder")} />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[400px] rounded-xl border-border">
                {socioculturalOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className={SELECT_GROUP_LABEL_CLASS}>{t("componentSociocultural")}</SelectLabel>
                    {renderSchoolSubjectItems(socioculturalOptions)}
                  </SelectGroup>
                )}
                {scientificOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className={SELECT_GROUP_LABEL_CLASS}>{t("componentCientifica")}</SelectLabel>
                    {renderSchoolSubjectItems(scientificOptions)}
                  </SelectGroup>
                )}
                {unitOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className={SELECT_GROUP_LABEL_CLASS}>{t("componentTecnica")}</SelectLabel>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit.code} value={unitKey(unit.code)} className={cn(SELECT_ITEM_CLASS, "pl-4")}>
                        {unit.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    );
  };

  const renderRegular = () => (
    <div className="space-y-3">
      {hasPreferredSubjects && (
        <div>
          <p className={SECTION_LABEL_CLASS}>{t("yourSubjects")}</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {preferredSubjects.map((option) => {
              const isSelected = subject === option.id;
              return (
                <ChoiceChip
                  key={option.id}
                  selected={isSelected}
                  highlighted
                  disabled={disabled}
                  onClick={() => onUpdate("subject", isSelected ? "" : option.id)}
                >
                  {translateSubjectLabel(option.id)}
                </ChoiceChip>
              );
            })}
            {showMoreToggle(showAllSubjects, () => setShowAllSubjects((current) => !current), t("showAllSubjects"))}
          </div>
        </div>
      )}

      {showRegularSelect && (
        <Select value={subject} onValueChange={(value) => onUpdate("subject", value)} disabled={disabled}>
          <SelectTrigger className={SELECT_TRIGGER_CLASS} aria-label={t("selectAriaLabel")}>
            <SelectValue placeholder={disabled ? t("placeholderDisabled") : t("placeholder")} />
          </SelectTrigger>
          <SelectContent className="max-h-[400px] rounded-xl border-border">
            {categories.map((category) => {
              const categorySubjects = groupedSubjects[category];
              if (!categorySubjects?.length) return null;
              return (
                <SelectGroup key={category}>
                  <SelectLabel className={SELECT_GROUP_LABEL_CLASS}>{translateSubjectCategory(category)}</SelectLabel>
                  {categorySubjects.map((option) => (
                    <SelectItem key={option.id} value={option.id} className={cn(SELECT_ITEM_CLASS, "pl-4")}>
                      {translateSubjectLabel(option.id)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {isAmbiguous && !disabled && (
        <div className="space-y-2 rounded-xl bg-muted/50 p-3">
          <p className="text-xs font-medium text-foreground">{t("componentLabel")}</p>
          <SegmentedControl
            size="sm"
            value={isSpecificComponent ? "specific" : "general"}
            onChange={(value) => onUpdate("isSpecificComponent", value === "specific")}
            ariaLabel={t("componentLabel")}
            className="bg-background"
            options={[
              { value: "general", label: t("generalTraining") },
              { value: "specific", label: t("specificTraining") },
            ]}
          />
          <p className="text-xs text-muted-foreground">{t("componentHint")}</p>
        </div>
      )}
    </div>
  );

  return (
    <Card className={cn("p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10 sm:rounded-xl">
            <BookOpen className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {isVocational ? t("titleVocational") : t("title")} <span className="text-destructive">*</span>
          </h2>
        </div>

        {isVocational ? renderVocational() : renderRegular()}
      </div>
    </Card>
  );
}
