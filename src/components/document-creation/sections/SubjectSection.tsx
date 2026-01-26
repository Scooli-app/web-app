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
              Disciplina <span className="text-destructive">*</span>
            </h2>
          </div>

          {isAmbiguous && !disabled && (
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
                Formação Geral
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
                Formação Específica
              </button>
            </div>
          )}
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
          <SelectContent className="rounded-xl border-border max-h-[400px]">
            {categoryOrder.map((category) => {
              const categorySubjects = groupedSubjects[category];
              if (!categorySubjects?.length) return null;

              return (
                <SelectGroup key={category}>
                  <SelectLabel className="bg-background px-2 py-2 text-sm font-bold text-primary border-b border-border/50 rounded-lg mb-1">
                    {category}
                  </SelectLabel>
                  {categorySubjects.map((subjectOption) => (
                    <SelectItem
                      key={subjectOption.id}
                      value={subjectOption.id}
                      className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-4"
                    >
                      {subjectOption.label}
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
                    {category}
                  </SelectLabel>
                  {groupedSubjects[category].map((subjectOption) => (
                    <SelectItem
                      key={subjectOption.id}
                      value={subjectOption.id}
                      className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-accent focus:text-primary pl-4"
                    >
                      {subjectOption.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
