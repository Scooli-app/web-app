import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import { SUBJECTS } from "../constants";
import type { FormUpdateFn } from "../types";

interface SubjectSectionProps {
  subject: string;
  onUpdate: FormUpdateFn;
}

export function SubjectSection({ subject, onUpdate }: SubjectSectionProps) {
  const selectedSubject = SUBJECTS.find((s) => s.id === subject);

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
        <Select value={subject} onValueChange={(value) => onUpdate("subject", value)}>
          <SelectTrigger
            className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-background border-border rounded-xl"
            aria-label="Selecionar disciplina"
          >
            <SelectValue placeholder="Selecione uma disciplina...">
              {selectedSubject && (
                <span className="flex items-center gap-2">
                  <span>{selectedSubject.icon}</span>
                  <span>{selectedSubject.label}</span>
                </span>
              )}
            </SelectValue>
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
