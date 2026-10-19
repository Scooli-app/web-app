import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { translateSubjectLabel } from "../constants";

interface FilledSummaryProps {
  schoolYear: number;
  subjectId: string;
  onChange: () => void;
}

/**
 * One line in place of the Ano and Disciplina cards when quick-create already
 * filled both: the teacher sees what was understood and can reopen the cards.
 */
export function FilledSummary({ schoolYear, subjectId, onChange }: FilledSummaryProps) {
  const t = useTranslations("documentCreation.filledSummary");

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <GraduationCap className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
        {t("year", { year: schoolYear })} · {translateSubjectLabel(subjectId)}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onChange} className="text-primary">
        {t("change")}
      </Button>
    </div>
  );
}
