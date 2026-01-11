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
import { cn } from "@/shared/utils/utils";
import { BookOpen, Check } from "lucide-react";
import { AMBIGUOUS_COMPONENTS_SUBJECTS, SUBJECTS } from "../constants";
import type { FormUpdateFn } from "../types";

interface SubjectSectionProps {
  subject: string;
  isSpecificComponent?: boolean;
  onUpdate: FormUpdateFn;
  availableSubjects?: string[];
  className?: string;
  disabled?: boolean;
}

export function SubjectSection({
  subject,
  isSpecificComponent,
  onUpdate,
  availableSubjects,
  className,
  disabled,
}: SubjectSectionProps) {
  // Filter subjects based on availableSubjects prop if provided
  const visibleSubjects = availableSubjects
    ? SUBJECTS.filter((s) => availableSubjects.includes(s.id))
    : SUBJECTS;

  // Group subjects by category
  const groupedSubjects = visibleSubjects.reduce((acc, subject) => {
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

  return (
    <Card className="p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Disciplina <span className="text-destructive">*</span>
          </h2>
        </div>

        <Select
          value={subject}
          onValueChange={(value) => onUpdate("subject", value)}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-background border-border rounded-xl"
            aria-label="Selecionar disciplina"
          >
            <SelectValue
              placeholder={
                disabled
                  ? "Selecione primeiro o ano de escolaridade..."
                  : "Selecione uma disciplina..."
              }
            />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border max-h-[280px]">
            {SUBJECTS.map((subjectOption) => (
              <SelectItem
                key={subjectOption.id}
                value={subjectOption.id}
                className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary"
              >
                <span className="flex items-center gap-2">
                  <span>{subjectOption.icon}</span>
                  <span>{subjectOption.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
