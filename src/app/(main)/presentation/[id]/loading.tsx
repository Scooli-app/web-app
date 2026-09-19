"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PresentationEditorLoading() {
  const t = useTranslations("editor.blockEditor");
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">{t("loadingPresentation")}</span>
      </div>
    </div>
  );
}
