"use client";

import { presentationToCanvas } from "@/components/document-editor-v2/canvas-layout";
import { SlideThumbnail } from "@/components/document-editor-v2/SlideThumbnail";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadError } from "@/components/ui/load-error";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getDocumentVersion,
  getDocumentVersions,
  restoreDocumentVersion,
} from "@/services/api/document.service";
import type { Document } from "@/shared/types";
import { isCanvasPresentation, type CanvasPresentation } from "@/shared/types/canvas-presentation";
import { parsePresentationDocument } from "@/shared/types/blocks";
import type { DocumentVersionDetail, DocumentVersionSummary } from "@/shared/types/document-versions";
import { listedVersions } from "@/shared/utils/document-versions";
import { History } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";
import { DocumentVersionRestoreButton, DocumentVersionRow } from "./DocumentVersionRow";

interface Props {
  documentId: string;
  /** Called with the restored document; the editor swaps its content for it. */
  onRestored: (document: Document) => void;
}

type LoadStatus = "loading" | "error" | "ready";

/** Presentation content is stored as canvas JSON or as the older block JSON. */
function parsePresentationVersion(content: string): CanvasPresentation | null {
  try {
    const raw: unknown = JSON.parse(content);
    if (isCanvasPresentation(raw)) return raw;
    return presentationToCanvas(parsePresentationDocument(content));
  } catch {
    return null;
  }
}

/**
 * "Versões" button for the document editors. Opens a sheet with the history,
 * a read-only preview of the selected version and the restore action.
 */
export function DocumentVersionsButton({ documentId, onRestored }: Props) {
  const t = useTranslations("editor.documentVersions");
  const format = useFormatter();

  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersionSummary[]>([]);
  const [listStatus, setListStatus] = useState<LoadStatus>("loading");
  const [listAttempt, setListAttempt] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocumentVersionDetail | null>(null);
  const [previewStatus, setPreviewStatus] = useState<LoadStatus>("loading");
  const [previewAttempt, setPreviewAttempt] = useState(0);

  const [restoreTarget, setRestoreTarget] = useState<DocumentVersionSummary | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const visible = listedVersions(versions);
  const selected = visible.find((version) => version.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    setListStatus("loading");
    getDocumentVersions(documentId)
      .then((items) => {
        if (ignore) return;
        setVersions(items);
        setListStatus("ready");
      })
      .catch(() => {
        if (!ignore) setListStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, [open, documentId, listAttempt]);

  useEffect(() => {
    if (!open || !selectedId) return;
    let ignore = false;
    setPreview(null);
    setPreviewStatus("loading");
    getDocumentVersion(documentId, selectedId)
      .then((detail) => {
        if (ignore) return;
        setPreview(detail);
        setPreviewStatus("ready");
      })
      .catch(() => {
        if (!ignore) setPreviewStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, [open, documentId, selectedId, previewAttempt]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setSelectedId(null);
  }, []);

  const handleRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const restored = await restoreDocumentVersion(documentId, restoreTarget.id);
      setRestoreTarget(null);
      handleOpenChange(false);
      onRestored(restored);
      toast.success(t("restoredToast"));
    } catch {
      toast.error(t("restoreError"));
    } finally {
      setIsRestoring(false);
    }
  }, [documentId, handleOpenChange, onRestored, restoreTarget, t]);

  const restoreDate = restoreTarget
    ? format.dateTime(new Date(restoreTarget.createdAt), { dateStyle: "long", timeStyle: "short" })
    : "";

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <SheetTrigger asChild>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label={t("buttonLabel")}>
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("buttonLabel")}</span>
              </Button>
            </TooltipTrigger>
          </SheetTrigger>
          <TooltipContent>{t("buttonTooltip")}</TooltipContent>
        </Tooltip>

        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-lg">
          <SheetHeader className="border-b border-border">
            <SheetTitle>{t("sheetTitle")}</SheetTitle>
            <SheetDescription>{t("sheetDescription")}</SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {listStatus === "loading" && (
              <div className="flex flex-col gap-2" aria-busy="true">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            )}

            {listStatus === "error" && (
              <LoadError message={t("listLoadError")} onRetry={() => setListAttempt((n) => n + 1)} />
            )}

            {listStatus === "ready" && (
              <div className="flex flex-col gap-2">
                {visible.map((version) => (
                  <DocumentVersionRow
                    key={version.id}
                    version={version}
                    selected={version.id === selectedId}
                    onSelect={(item) => setSelectedId(item.id)}
                  />
                ))}
              </div>
            )}

            {listStatus === "ready" && !selected && (
              <p className="text-sm text-muted-foreground">{t("pickVersionHint")}</p>
            )}

            {selected && (
              <section className="flex flex-col gap-3 border-t border-border pt-4" aria-label={t("previewLabel")}>
                {previewStatus === "loading" && <Skeleton className="h-40 w-full rounded-lg" />}

                {previewStatus === "error" && (
                  <LoadError message={t("previewLoadError")} onRetry={() => setPreviewAttempt((n) => n + 1)} />
                )}

                {previewStatus === "ready" && preview && (
                  preview.contentFormat === "json" ? (
                    <PresentationPreview content={preview.content} />
                  ) : (
                    <div className="max-h-[50dvh] overflow-y-auto rounded-lg border border-border bg-background p-4 text-sm leading-relaxed text-foreground [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc">
                      <Markdown remarkPlugins={[remarkBreaks]}>{preview.content}</Markdown>
                    </div>
                  )
                )}

                <div className="flex justify-end">
                  <DocumentVersionRestoreButton version={selected} onRestore={setRestoreTarget} />
                </div>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationDialog
        isOpen={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => void handleRestore()}
        title={t("restoreTitle", { date: restoreDate })}
        description={t("restoreDescription")}
        confirmLabel={t("restoreConfirm")}
        variant="warning"
      />
      {isRestoring && <span className="sr-only" role="status">{t("restoring")}</span>}
    </>
  );
}

function PresentationPreview({ content }: { content: string }) {
  const t = useTranslations("editor.documentVersions");
  const canvas = parsePresentationVersion(content);

  if (!canvas || canvas.slides.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("previewLoadError")}</p>;
  }

  return (
    <div className="flex flex-wrap gap-3" aria-label={t("slidesLabel")}>
      {canvas.slides.map((slide, index) => (
        <SlideThumbnail key={slide.id} slide={slide} index={index} w={160} h={90} />
      ))}
    </div>
  );
}
