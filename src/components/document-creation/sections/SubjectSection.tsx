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
import { BookOpen } from "lucide-react";
import { SUBJECTS } from "../constants";
import type { FormUpdateFn } from "../types";

interface SubjectSectionProps {
  subject: string;
  onUpdate: FormUpdateFn;
  availableSubjects?: string[];
  className?: string;
  disabled?: boolean;
}

export function SubjectSection({ subject, onUpdate, availableSubjects, className, disabled }: SubjectSectionProps) {
  // Filter subjects based on availableSubjects prop if provided
  const visibleSubjects = availableSubjects 
    ? SUBJECTS.filter(s => availableSubjects.includes(s.id))
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

  return (
    <Card className={cn("p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Disciplina <span className="text-destructive">*</span>
          </h2>
        </div>
        <Select value={subject} onValueChange={(value) => onUpdate("subject", value)} disabled={disabled}>
          <SelectTrigger
            className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-background border-border rounded-xl"
            aria-label="Selecionar disciplina"
          >
            <SelectValue placeholder={disabled ? "Selecione primeiro o ano de escolaridade..." : "Selecione uma disciplina..."} />
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
            {/* Handle any categories not in the explicit order list */}
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
