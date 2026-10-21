"use client";

import { Button } from "@/components/ui/button";
import { getDocument } from "@/services/api/document.service";
import type { Document } from "@/shared/types/document";
import type { PendingSuggestion } from "@/shared/types/document-versions";
import { documentRefreshed } from "@/store/documents/documentSlice";
import { useAppDispatch } from "@/store/hooks";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SuggestionReviewSheet, type SuggestionContentFormat } from "./SuggestionReviewSheet";
import { pollUntilDone } from "./suggestion-review";

export interface SuggestionBarProps {
  documentId: string;
  /** The document's pending suggestion, or null/undefined when there is none. */
  suggestion: PendingSuggestion | null | undefined;
  contentFormat: SuggestionContentFormat;
  /** Runs before the editor content is replaced, so an editor can reset local state (e.g. a canvas). */
  onContentReplaced?: () => void;
}

/**
 * A slim bar above the document while a suggested version is being written or waiting for review.
 * Writing: polls the document every 5 s until the suggestion is ready. Ready: opens the review sheet.
 */
export function SuggestionBar({ documentId, suggestion, contentFormat, onContentReplaced }: SuggestionBarProps) {
  const t = useTranslations("documentVersions.bar");
  const dispatch = useAppDispatch();
  const [reviewOpen, setReviewOpen] = useState(false);
  const generating = suggestion?.status === "generating";

  useEffect(() => {
    if (!generating) return;
    return pollUntilDone({
      check: async () => {
        const doc = await getDocument(documentId);
        if (doc.pendingSuggestion?.status === "generating") return false;
        dispatch(documentRefreshed(doc));
        return true;
      },
    });
  }, [documentId, generating, dispatch]);

  if (!suggestion) return null;

  const refreshWith = (doc: Document) => {
    onContentReplaced?.();
    dispatch(documentRefreshed(doc));
  };

  return (
    <>
      <div
        role="status"
        className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium text-foreground">{t("preparing")}</p>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t("title")}</p>
              {suggestion.reason?.summary && (
                <p className="mt-0.5 text-sm text-muted-foreground">{suggestion.reason.summary}</p>
              )}
            </div>
            <Button size="sm" onClick={() => setReviewOpen(true)}>
              {t("review")}
            </Button>
          </>
        )}
      </div>

      {!generating && (
        <SuggestionReviewSheet
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          documentId={documentId}
          suggestion={suggestion}
          contentFormat={contentFormat}
          onApplied={(doc) => {
            setReviewOpen(false);
            refreshWith(doc);
          }}
          onRejected={() => {
            setReviewOpen(false);
            void getDocument(documentId).then(refreshWith).catch(() => undefined);
          }}
        />
      )}
    </>
  );
}
