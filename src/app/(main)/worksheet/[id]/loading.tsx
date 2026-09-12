"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function WorksheetEditorLoading() {
  const t = useTranslations("documentEditorPages.worksheet");
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">{t("loading")}</span>
      </div>
    </div>
  );
}
