"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CourseSearchField } from "@/components/teaching-profile/CourseSearchField";
import { useCourseSearch } from "@/components/teaching-profile/course-search";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type { TeachingProfile } from "@/shared/types/teaching-profile";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface QuickAddVocationalCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called after the course was saved to the teacher's profile, with the
   * freshly saved profile and the code the teacher just picked, so the
   * wizard can switch into vocational mode with that course selected.
   */
  onCourseAdded: (profile: TeachingProfile, courseCode: string) => void;
}

/**
 * Lets a first-time técnico teacher pick their curso profissional without
 * leaving the creation wizard: tapping "Curso profissional" with zero saved
 * courses opens this instead of redirecting to Settings. Reuses the same
 * course-search catalogue/field as the Settings "O Meu Ensino" course
 * editor (VocationalCoursesEditor) so the picking experience matches.
 */
export function QuickAddVocationalCourseDialog({
  open,
  onOpenChange,
  onCourseAdded,
}: QuickAddVocationalCourseDialogProps) {
  const t = useTranslations("documentCreation.classContext");
  const tSettings = useTranslations("settings.teachingProfileCard");
  const { catalog, catalogError, term, setTerm, results } = useCourseSearch(tSettings("catalogError"));
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = async (code: string) => {
    setIsSaving(true);
    try {
      const current = await teachingProfileService.get();
      const nextCourses = current.courses.includes(code)
        ? current.courses
        : [...current.courses, code];
      const saved = await teachingProfileService.save({
        ...current,
        courses: nextCourses,
        // A course with no UC picked yet is still valid — the creation form
        // falls back to the course's full catalogue (see
        // getVocationalCourseOptions), same as adding a course in Settings.
        educationType: "vocational",
      });
      onCourseAdded(saved, code);
      onOpenChange(false);
      setTerm("");
    } catch {
      toast.error(t("quickAddError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("quickAddTitle")}</DialogTitle>
          <DialogDescription>{t("quickAddDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 p-6 pt-4">
          <CourseSearchField
            inputId="quick-add-course-search"
            term={term}
            onTermChange={setTerm}
            catalog={catalog}
            catalogError={catalogError}
            results={results}
            addedCodes={new Set<string>()}
            onSelect={(code) => void handleSelect(code)}
            disabled={isSaving}
            autoFocus
          />
          {isSaving && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("quickAddSaving")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
