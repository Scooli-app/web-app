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
  // Tailwind classes for selected and unselected states
  selectedCls: string;
  unselectedCls: string;
  badgeSelectedCls: string;
}> = [
  {
    value: "all",
    label: "Todos",
    icon: Folder,
    selectedCls: "border-primary bg-primary text-primary-foreground shadow-sm",
    unselectedCls: "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-primary",
    badgeSelectedCls: "bg-white/20 text-primary-foreground",
  },
  {
    value: "lessonPlan",
    label: "Planos de Aula",
    icon: FileText,
    selectedCls: "border-primary bg-primary text-primary-foreground shadow-sm",
    unselectedCls: "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-primary",
    badgeSelectedCls: "bg-white/20 text-primary-foreground",
  },
  {
    value: "worksheet",
    label: "Fichas de Trabalho",
    icon: ScrollText,
    selectedCls: "border-teal-500 bg-teal-500 text-white shadow-sm dark:border-teal-600 dark:bg-teal-600",
    unselectedCls: "border-border bg-card text-muted-foreground hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400",
    badgeSelectedCls: "bg-white/20 text-white",
  },
  {
    value: "test",
    label: "Testes",
    icon: NotebookPen,
    selectedCls: "border-orange-500 bg-orange-500 text-white shadow-sm dark:border-orange-600 dark:bg-orange-600",
    unselectedCls: "border-border bg-card text-muted-foreground hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400",
    badgeSelectedCls: "bg-white/20 text-white",
  },
  {
    value: "quiz",
    label: "Quizzes",
    icon: HelpCircle,
    selectedCls: "border-amber-500 bg-amber-500 text-white shadow-sm dark:border-amber-600 dark:bg-amber-600",
    unselectedCls: "border-border bg-card text-muted-foreground hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400",
    badgeSelectedCls: "bg-white/20 text-white",
  },
  {
    value: "presentation",
    label: "Apresentações",
    icon: MonitorPlay,
    selectedCls: "border-rose-500 bg-rose-500 text-white shadow-sm dark:border-rose-600 dark:bg-rose-600",
    unselectedCls: "border-border bg-card text-muted-foreground hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400",
    badgeSelectedCls: "bg-white/20 text-white",
  },
  {
    value: "curriculumPlan",
    label: "Planificações",
    icon: CalendarDays,
    selectedCls: "border-indigo-500 bg-indigo-500 text-white shadow-sm dark:border-indigo-600 dark:bg-indigo-600",
    unselectedCls: "border-border bg-card text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400",
    badgeSelectedCls: "bg-white/20 text-white",
  },
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
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200 sm:gap-2 sm:px-4 sm:text-sm ${isSelected ? option.selectedCls : option.unselectedCls}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{option.label}</span>
              {documentCounts && (
                <Badge
                  className={`ml-0.5 px-2 py-0 text-xs ${isSelected ? option.badgeSelectedCls : "bg-muted text-muted-foreground"}`}
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
