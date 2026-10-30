"use client";

import { Routes } from "@/shared/types";
import { fetchDocument } from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** A document that did not load: gone (or someone else's), or the server didn't answer, which a retry can fix. */
export function DocumentNotFound({ documentId }: { documentId?: string }) {
  const t = useTranslations("editor.documentEditor");
  const dispatch = useAppDispatch();
  const loadError = useAppSelector((s) => s.documents.documentLoadError);
  const unreachable = !!documentId && loadError?.id === documentId && (loadError.status === 0 || loadError.status >= 500);
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="text-center">
        <p className="text-lg text-muted-foreground mb-4">{t(unreachable ? "documentUnreachable" : "documentNotFound")}</p>
        <div className="flex items-center justify-center gap-4">
          {unreachable && (
            <button type="button" onClick={() => void dispatch(fetchDocument(documentId))} className="text-primary hover:underline">
              {t("retryLoad")}
            </button>
          )}
          <Link href={Routes.DOCUMENTS} className="text-primary hover:underline">
            {t("backToDocuments")}
          </Link>
        </div>
      </div>
    </div>
  );
}
