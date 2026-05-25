"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECTS } from "@/components/document-creation/constants";
import type { Document } from "@/shared/types";
import {
  selectIsCurriculumPlanEnabled,
  selectIsPresentationCreationEnabled,
} from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import {
  CalendarDays,
  FileText,
  Folder,
  HelpCircle,
  MonitorPlay,
  NotebookPen,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type DocumentOriginFilter = "all" | "ai" | "imported";

interface DocumentFiltersProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  documentCounts?: Record<string, number>;
  selectedSubject?: string;
  onSubjectChange?: (subject: string) => void;
  selectedGrade?: string;
  onGradeChange?: (grade: string) => void;
  selectedOrigin?: DocumentOriginFilter;
  onOriginChange?: (origin: DocumentOriginFilter) => void;
}

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const typeFilterOptions: Array<{
  value: Document["documentType"] | "all";
  label: string;
  icon: LucideIcon;
}> = [
  { value: "all", label: "Todos", icon: Folder },
  { value: "lessonPlan", label: "Planos de Aula", icon: FileText },
  { value: "worksheet", label: "Fichas de Trabalho", icon: ScrollText },
  { value: "test", label: "Testes", icon: NotebookPen },
  { value: "quiz", label: "Quizzes", icon: HelpCircle },
  { value: "presentation", label: "Apresentações", icon: MonitorPlay },
  { value: "curriculumPlan", label: "Planificações", icon: CalendarDays },
];

const originOptions: Array<{ value: DocumentOriginFilter; label: string }> = [
  { value: "all", label: "Qualquer origem" },
  { value: "ai", label: "Gerado por IA" },
  { value: "imported", label: "Importado" },
];

export function DocumentFilters({
  selectedType,
  onTypeChange,
  documentCounts,
  selectedSubject = "",
  onSubjectChange,
  selectedGrade = "",
  onGradeChange,
  selectedOrigin = "all",
  onOriginChange,
}: DocumentFiltersProps) {
  const isPresentationCreationEnabled = useAppSelector(
    selectIsPresentationCreationEnabled
  );
  const isCurriculumPlanEnabled = useAppSelector(selectIsCurriculumPlanEnabled);

  const visibleTypeOptions = typeFilterOptions.filter((option) => {
    if (option.value === "presentation" && !isPresentationCreationEnabled)
      return false;
    if (option.value === "curriculumPlan" && !isCurriculumPlanEnabled)
      return false;
    return true;
  });

  const totalCount = documentCounts
    ? Object.values(documentCounts).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Document type chips */}
      <div className="flex flex-wrap gap-2">
        {visibleTypeOptions.map((option) => {
          const isSelected = selectedType === option.value;
          const count =
            option.value === "all"
              ? totalCount
              : (documentCounts?.[option.value] ?? 0);
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              onClick={() => onTypeChange(option.value)}
              className={`
                inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium
                transition-all duration-200 sm:gap-2 sm:px-4 sm:text-sm
                ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary"
                }
              `}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{option.label}</span>
              {documentCounts && (
                <Badge
                  className={`ml-0.5 px-2 py-0 text-xs ${
                    isSelected
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Secondary filters: subject, grade, origin */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Subject */}
        <Select
          value={selectedSubject || "__all__"}
          onValueChange={(v) => onSubjectChange?.(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[10rem] border-dashed text-xs">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as disciplinas</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s.id} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Grade / Year */}
        <Select
          value={selectedGrade || "__all__"}
          onValueChange={(v) => onGradeChange?.(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[8rem] border-dashed text-xs">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os anos</SelectItem>
            {GRADE_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}.º ano
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origin */}
        <Select
          value={selectedOrigin}
          onValueChange={(v) => onOriginChange?.(v as DocumentOriginFilter)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[9rem] border-dashed text-xs">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            {originOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}


const originOptions: Array<{ value: DocumentOriginFilter; label: string }> = [
  { value: "all", label: "Qualquer origem" },
  { value: "ai", label: "Gerado por IA" },
  { value: "imported", label: "Importado" },
];

export function DocumentFilters({
  selectedType,
  onTypeChange,
  documentCounts,
  selectedSubject = "",
  onSubjectChange,
  selectedGrade = "",
  onGradeChange,
  selectedOrigin = "all",
  onOriginChange,
}: DocumentFiltersProps) {
  const isPresentationCreationEnabled = useAppSelector(
    selectIsPresentationCreationEnabled
  );
  const isCurriculumPlanEnabled = useAppSelector(selectIsCurriculumPlanEnabled);

  const visibleTypeOptions = typeFilterOptions.filter((option) => {
    if (option.value === "presentation" && !isPresentationCreationEnabled)
      return false;
    if (option.value === "curriculumPlan" && !isCurriculumPlanEnabled)
      return false;
    return true;
  });

  const totalCount = documentCounts
    ? Object.values(documentCounts).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Document type chips */}
      <div className="flex flex-wrap gap-2">
        {visibleTypeOptions.map((option) => {
          const isSelected = selectedType === option.value;
          const count =
            option.value === "all"
              ? totalCount
              : (documentCounts?.[option.value] ?? 0);

          return (
            <button
              key={option.value}
              onClick={() => onTypeChange(option.value)}
              className={`
                inline-flex items-center space-x-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium
                transition-all duration-200 sm:space-x-2 sm:px-4 sm:text-sm
                ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary"
                }
              `}
            >
              <span className="text-sm sm:text-base">{option.icon}</span>
              <span>{option.label}</span>
              {documentCounts && (
                <Badge
                  className={`ml-1 px-2 py-0 text-xs ${
                    isSelected
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Secondary filters: subject, grade, origin */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Subject */}
        <Select
          value={selectedSubject || "__all__"}
          onValueChange={(v) => onSubjectChange?.(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[10rem] border-dashed text-xs">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as disciplinas</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s.id} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Grade / Year */}
        <Select
          value={selectedGrade || "__all__"}
          onValueChange={(v) => onGradeChange?.(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[8rem] border-dashed text-xs">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os anos</SelectItem>
            {GRADE_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}.º ano
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origin */}
        <Select
          value={selectedOrigin}
          onValueChange={(v) => onOriginChange?.(v as DocumentOriginFilter)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[9rem] border-dashed text-xs">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            {originOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
