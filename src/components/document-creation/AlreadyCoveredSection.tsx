"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { SUBJECTS } from "@/components/document-creation/constants";
import { getTopicDomains } from "@/services/api/timetable.service";
import { cn } from "@/shared/utils/utils";

interface AlreadyCoveredSectionProps {
  subject: string; // internal SUBJECTS id
  gradeLevel: string;
  selectedDomains: string[];
  notes: string;
  onDomainsChange: (domains: string[]) => void;
  onNotesChange: (notes: string) => void;
}

/**
 * Lets a teacher creating a turma mid-year (from scratch, or one-click from a
 * planificação) mark what's already been taught, so topic generation doesn't
 * restart the subject from lesson 1. Two mechanisms on purpose: a structured,
 * AE-ordered domain checklist (recognition — reliable even when the teacher's
 * memory of everything they covered is fuzzy) plus free text as a catch-all
 * for anything not on that list. See TimetableService.generateTopics /
 * TopicGenerationPrompts on the backend.
 */
export function AlreadyCoveredSection({
  subject, gradeLevel, selectedDomains, notes, onDomainsChange, onNotesChange,
}: AlreadyCoveredSectionProps) {
  const t = useTranslations("calendar.novo");
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!subject || !gradeLevel) {
      setDomains([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const subjectValue = SUBJECTS.find((s) => s.id === subject)?.value ?? subject;
    getTopicDomains(subjectValue, Number(gradeLevel))
      .then((res) => { if (!cancelled) setDomains(res); })
      .catch(() => { if (!cancelled) setDomains([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subject, gradeLevel]);

  if (!subject || !gradeLevel) return null;

  const toggleDomain = (domain: string) => {
    onDomainsChange(
      selectedDomains.includes(domain)
        ? selectedDomains.filter((d) => d !== domain)
        : [...selectedDomains, domain]
    );
  };

  // Content is sequential — marking "até aqui" checks everything up to and including
  // that domain in one click; individual toggles stay available right below for
  // teachers who taught out of the canonical order.
  const markUpTo = (index: number) => onDomainsChange(domains.slice(0, index + 1));

  const hasContent = selectedDomains.length > 0 || notes.trim().length > 0;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-medium">{t("alreadyCovered.title")}</p>
          <p className="text-xs text-muted-foreground">
            {hasContent
              ? t("alreadyCovered.summary", { count: selectedDomains.length })
              : t("alreadyCovered.subtitle")}
          </p>
        </div>
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : domains.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("alreadyCovered.domainsLabel")}</Label>
              <div className="space-y-1">
                {domains.map((domain, i) => (
                  <div key={domain} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selectedDomains.includes(domain)}
                      onChange={() => toggleDomain(domain)}
                      className="h-3.5 w-3.5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{domain}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-primary hover:underline"
                      onClick={() => markUpTo(i)}
                    >
                      {t("alreadyCovered.markUpToHere")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("alreadyCovered.notesLabel")}</Label>
            <textarea
              className="min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder={t("alreadyCovered.notesPlaceholder")}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
