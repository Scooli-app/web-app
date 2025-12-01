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
    <Card className="p-4 sm:p-6 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
            Disciplina <span className="text-red-500">*</span>
          </h2>
        </div>
        <Select value={subject} onValueChange={(value) => onUpdate("subject", value)}>
          <SelectTrigger
            className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-white border-[#C7C9D9] rounded-xl focus:border-[#6753FF] focus:ring-[#6753FF]/20"
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
          <SelectContent className="rounded-xl border-[#C7C9D9] max-h-[280px]">
            {SUBJECTS.map((subjectOption) => (
              <SelectItem
                key={subjectOption.id}
                value={subjectOption.id}
                className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-[#EEF0FF] focus:text-[#6753FF]"
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

