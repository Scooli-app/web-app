"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SUBJECTS, translateSubjectLabel } from "@/components/document-creation/constants";
import type { Document } from "@/shared/types";
import {
  selectIsCurriculumPlanEnabled,
  selectIsPresentationCreationEnabled,
} from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

export type DocumentOriginFilter = "all" | "ai" | "imported";

/** "" = every document, "none" = documents outside any turma, otherwise a timetable id. */
export const NO_CLASS_FILTER = "none";

export interface DocumentClassOption {
  id: string;
  title: string;
  color: string;
}

interface DocumentFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  /** The "Agrupar por turma" switch. */
  grouped: boolean;
  onGroupedChange: (grouped: boolean) => void;
  /** The Turma select is shown only when the list isn't already grouped by turma. */
  showClassFilter: boolean;
  classes: DocumentClassOption[];
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedSubject: string;
  onSubjectChange: (subject: string) => void;
  selectedGrade: string;
  onGradeChange: (grade: string) => void;
  selectedOrigin: DocumentOriginFilter;
  onOriginChange: (origin: DocumentOriginFilter) => void;
}

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const TYPE_OPTIONS: Array<Document["documentType"] | "all"> = [
  "all",
  "lessonPlan",
  "worksheet",
  "test",
  "quiz",
  "presentation",
  "curriculumPlan",
];

const ORIGIN_OPTIONS: DocumentOriginFilter[] = ["all", "ai", "imported"];
const ALL = "__all__";

/**
 * One bar: search, type, the turma grouping switch (or the turma select when not grouped) and
 * the rarely used filters tucked under "Mais filtros".
 */
export function DocumentFilters({
  search,
  onSearchChange,
  selectedType,
  onTypeChange,
  grouped,
  onGroupedChange,
  showClassFilter,
  classes,
  selectedClass,
  onClassChange,
  selectedSubject,
  onSubjectChange,
  selectedGrade,
  onGradeChange,
  selectedOrigin,
  onOriginChange,
}: DocumentFiltersProps) {
  const t = useTranslations("documents.filters");
  const isPresentationCreationEnabled = useAppSelector(selectIsPresentationCreationEnabled);
  const isCurriculumPlanEnabled = useAppSelector(selectIsCurriculumPlanEnabled);

  const typeOptions = TYPE_OPTIONS.filter((value) => {
    if (value === "presentation" && !isPresentationCreationEnabled) return false;
    if (value === "curriculumPlan" && !isCurriculumPlanEnabled) return false;
    return true;
  });

  const extraActive = [selectedSubject !== "", selectedGrade !== "", selectedOrigin !== "all"].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9"
          aria-label={t("searchPlaceholder")}
        />
      </div>

      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger className="h-9 w-auto min-w-[9rem]" aria-label={t("typeLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((value) => (
            <SelectItem key={value} value={value}>
              {value === "all" ? t("allTypes") : t(`types.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showClassFilter && classes.length > 0 && (
        <Select value={selectedClass || ALL} onValueChange={(v) => onClassChange(v === ALL ? "" : v)}>
          <SelectTrigger className="h-9 w-auto min-w-[10rem] max-w-[16rem]" aria-label={t("classes.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("classes.all")}</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  {c.title}
                </span>
              </SelectItem>
            ))}
            <SelectItem value={NO_CLASS_FILTER}>{t("classes.none")}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {classes.length > 0 && (
        <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
          <Switch id="documents-group-by-class" checked={grouped} onCheckedChange={onGroupedChange} />
          <Label htmlFor="documents-group-by-class" className="cursor-pointer whitespace-nowrap text-sm font-normal">
            {t("groupByClass")}
          </Label>
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9">
            <SlidersHorizontal className="mr-1.5 h-4 w-4" aria-hidden />
            {t("moreFilters")}
            {extraActive > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {extraActive}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("subjectPlaceholder")}</Label>
            <Select value={selectedSubject || ALL} onValueChange={(v) => onSubjectChange(v === ALL ? "" : v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allSubjects")}</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.id} value={s.value}>
                    {translateSubjectLabel(s.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("gradePlaceholder")}</Label>
            <Select value={selectedGrade || ALL} onValueChange={(v) => onGradeChange(v === ALL ? "" : v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allGrades")}</SelectItem>
                {GRADE_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {t("gradeOption", { grade: y })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("originPlaceholder")}</Label>
            <Select value={selectedOrigin} onValueChange={(v) => onOriginChange(v as DocumentOriginFilter)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGIN_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {t(`origin.${o}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {extraActive > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onSubjectChange("");
                onGradeChange("");
                onOriginChange("all");
              }}
            >
              {t("clearMoreFilters")}
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
