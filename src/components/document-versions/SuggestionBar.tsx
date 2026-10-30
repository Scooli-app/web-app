"use client";

import { Button } from "@/components/ui/button";
import { getDocument } from "@/services/api/document.service";
import type { Document } from "@/shared/types/document";
import type { PendingSuggestion } from "@/shared/types/document-suggestions";
import { setCurrentDocument } from "@/store/documents/documentSlice";
import { useAppDispatch } from "@/store/hooks";
import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { dismissSuggestion, isSuggestionDismissed, OPEN_SUGGESTION_REVIEW } from "./dismissedSuggestions";
import { SuggestionReviewSheet, type SuggestionContentFormat } from "./SuggestionReviewSheet";
import { pollUntilDone } from "./suggestion-review";

export interface SuggestionBarProps {
  documentId: string;
  /** The document's pending suggestion, or null/undefined when there is none. */
  suggestion: PendingSuggestion | null | undefined;
  contentFormat: SuggestionContentFormat;
  /** The document's type; only presentations get the slide view of a JSON suggestion. */
  documentType?: Document["documentType"];
  /** Saves the editor's unsaved edits before the review loads and before an apply ("saved": something was saved). */
  flushEdits?: () => Promise<"clean" | "saved" | "failed">;
  /** Runs before the editor content is replaced, so an editor can reset local state (e.g. a canvas). */
  onContentReplaced?: () => void;
  /** The editor was opened from "Por rever" (`?review=1`): the review sheet opens by itself once the suggestion is ready. */
  autoOpenReview?: boolean;
}

/**
 * Whether the review sheet should open by itself now: asked for from "Por rever", the suggestion is ready, and it
 * has not opened yet in this editor. Pure, so the rule can be checked on its own.
 */
export function shouldAutoOpenReview(input: {
  autoOpenReview: boolean;
  alreadyOpened: boolean;
  generating: boolean;
  status: PendingSuggestion["status"] | undefined;
}): boolean {
  return input.autoOpenReview && !input.alreadyOpened && !input.generating && input.status === "ready";
}

/**
 * A slim bar above the document while a suggested version is being written or waiting for review.
 * Writing: polls the document every 5 s until the suggestion is ready. Ready: opens the review sheet.
 */
export function SuggestionBar({
  documentId,
  suggestion,
  contentFormat,
  documentType,
  flushEdits,
  onContentReplaced,
  autoOpenReview = false,
}: SuggestionBarProps) {
  const t = useTranslations("documentVersions.bar");
  const dispatch = useAppDispatch();
  const [reviewOpen, setReviewOpen] = useState(false);
  // Set when "Atualizar sugestão" was accepted, so the bar shows the generating state before the document says so.
  const [awaitingRefresh, setAwaitingRefresh] = useState(false);
  const generating = suggestion?.status === "generating" || awaitingRefresh;
  const autoOpened = useRef(false);
  // Hidden with ✕ (this browser, this version): the review stays reachable from Versões.
  const versionId = suggestion?.versionId;
  // Read on the first render, so a hidden banner never flashes in.
  const [hidden, setHidden] = useState(() => (versionId ? isSuggestionDismissed(versionId) : false));
  useEffect(() => setHidden(versionId ? isSuggestionDismissed(versionId) : false), [versionId]);

  useEffect(() => {
    const open = (e: Event) => {
      if ((e as CustomEvent<{ documentId: string }>).detail?.documentId === documentId) setReviewOpen(true);
    };
    window.addEventListener(OPEN_SUGGESTION_REVIEW, open);
    return () => window.removeEventListener(OPEN_SUGGESTION_REVIEW, open);
  }, [documentId]);

  useEffect(() => {
    if (!shouldAutoOpenReview({ autoOpenReview, alreadyOpened: autoOpened.current, generating, status: suggestion?.status })) {
      return;
    }
    autoOpened.current = true;
    setReviewOpen(true);
  }, [autoOpenReview, generating, suggestion?.status]);

  useEffect(() => {
    if (!generating) return;
    return pollUntilDone({
      check: async () => {
        const doc = await getDocument(documentId);
        if (doc.pendingSuggestion?.status === "generating") return false;
        setAwaitingRefresh(false);
        dispatch(setCurrentDocument(doc));
        return true;
      },
    });
  }, [documentId, generating, dispatch]);

  if (!suggestion) return null;

  const refreshWith = (doc: Document) => {
    onContentReplaced?.();
    dispatch(setCurrentDocument(doc));
  };

  return (
    <>
      {!(hidden && !generating) && <div
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
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 h-8 w-8 shrink-0 text-muted-foreground max-md:h-11 max-md:w-11"
              aria-label={t("dismiss")}
              title={t("dismissHint")}
              onClick={() => {
                dismissSuggestion(suggestion.versionId);
                setHidden(true);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>}

      {!generating && (
        <SuggestionReviewSheet
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          documentId={documentId}
          suggestion={suggestion}
          contentFormat={contentFormat}
          documentType={documentType}
          flushEdits={flushEdits}
          onApplied={(doc) => {
            setReviewOpen(false);
            refreshWith(doc);
          }}
          onRejected={() => {
            setReviewOpen(false);
            void getDocument(documentId).then(refreshWith).catch(() => undefined);
          }}
          onRefreshed={() => {
            setReviewOpen(false);
            setAwaitingRefresh(true);
          }}
        />
      )}
    </>
  );
}
