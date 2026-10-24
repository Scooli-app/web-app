"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/utils";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

export function StudentToggle({ pressed, onChange }: { pressed: boolean; onChange: (next: boolean) => void }) {
  const t = useTranslations("assessmentEditor");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={pressed}
      title={t("studentViewHint")}
      onClick={() => onChange(!pressed)}
      className={cn("h-8 gap-1.5", pressed && "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
    >
      <Eye className="h-3.5 w-3.5" />
      {t("studentView")}
    </Button>
  );
}
