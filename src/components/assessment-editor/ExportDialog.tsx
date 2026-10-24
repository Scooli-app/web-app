"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExportError, exportDocument } from "@/services/export/documentExport";
import { Routes } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import type { ExportFile } from "@/types/assessment";
import { AlertTriangle, Crown, Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { PHONE_TOUCH } from "./context";

type Format = "pdf" | "docx";
type Family = "test" | "worksheet" | "quiz";
type Variant = ExportFile["variant"];
type Problem = "upsell" | "busy" | "revising" | "rateLimited" | "saveFailed" | "failed";
type Action = Variant | "both";

const VARIANTS: Variant[] = ["student", "teacher"];
const BOTH_GAP_MS = 400; // browsers drop the second of two back-to-back downloads
const CACHE_MS = 10 * 60 * 1000; // presigned URLs live 15 min
/** The backend's file name prefixes (DocumentExportService.PREFIXES), by the document's content language. */
const PREFIXES: Record<"pt" | "en", Record<Family, Record<Variant, string>>> = {
  pt: {
    test: { student: "Teste", teacher: "Critérios de correção" },
    worksheet: { student: "Ficha", teacher: "Soluções" },
    quiz: { student: "Quiz", teacher: "Respostas" },
  },
  en: {
    test: { student: "Test", teacher: "Marking guide" },
    worksheet: { student: "Worksheet", teacher: "Answer key" },
    quiz: { student: "Quiz", teacher: "Answers" },
  },
};

/** Mirrors DocumentExportService.safeTitle closely enough for a preview; the server's name wins once it answers. */
function safeTitle(title: string): string {
  const out = title
    .replace(/\//g, "-")
    .replace(/[\\:*?"<>|\u0000-\u001f\u007f\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\s]+/, "")
    .slice(0, 100)
    .replace(/[\uD800-\uDBFF]$/, "") // half an emoji
    .replace(/[.\s]+$/, "");
  return out || "documento";
}

function triggerDownload(file: ExportFile) {
  const a = window.document.createElement("a");
  a.href = file.url;
  a.download = file.filename;
  a.rel = "noopener";
  window.document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Export of a test / worksheet / quiz (mockup option C): both files listed, one button each plus
 * "Descarregar ambos". Nothing is generated until the first download click; the answer is cached per format.
 * Desktop dialog, bottom sheet on phones.
 */
export function ExportDialog({ open, onOpenChange, documentId, documentType, title, english, isPro, chatting, flush }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentType: string;
  title: string;
  /** The document is written in English: file names use the English prefixes, as the server does. */
  english: boolean;
  /** Null while the entitlement is still loading. */
  isPro: boolean | null;
  /** The assistant is revising the document: the files would miss its changes. */
  chatting: boolean;
  /** Saves pending edits; false when the save failed (the files would not match the screen). */
  flush: () => Promise<boolean>;
}) {
  const t = useTranslations("assessmentEditor.exportDialog");
  const tDownload = useTranslations("editor.downloadButton");
  const router = useRouter();
  const phone = useIsMobile();
  const family: Family = documentType === "worksheet" || documentType === "quiz" ? documentType : "test";
  const [format, setFormat] = useState<Format>("pdf");
  const [pending, setPending] = useState<Action | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [cache, setCache] = useState<Partial<Record<Format, { files: ExportFile[]; at: number }>>>({});
  const lastActionRef = useRef<Action>("both");
  const openRef = useRef(open);
  openRef.current = open;

  // The cache lives as long as the dialog is open: edits made after closing must reach the next files.
  useEffect(() => {
    if (!open) {
      setCache({});
      setPending(null);
      setProblem(null);
    }
  }, [open]);

  // The wait message is about this chat only; once it is over the teacher can simply click again.
  useEffect(() => {
    if (!chatting) setProblem((p) => (p === "busy" ? null : p));
  }, [chatting]);

  const fresh = cache[format] && Date.now() - cache[format].at < CACHE_MS ? cache[format].files : null;

  /** One export call per format: flush, generate, cache. Null when it could not produce the files. */
  const ensureFiles = async (fmt: Format): Promise<ExportFile[] | null> => {
    const hit = cache[fmt];
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.files;
    if (chatting) {
      setProblem("busy");
      return null;
    }
    if (!(await flush())) {
      setProblem("saveFailed");
      return null;
    }
    try {
      const files = await exportDocument(documentId, fmt);
      if (openRef.current) setCache((c) => ({ ...c, [fmt]: { files, at: Date.now() } }));
      return files;
    } catch (error) {
      const status = error instanceof ExportError ? error.status : 0;
      if (status === 403) setProblem("upsell");
      // A background revision or a generation still running: try again in a minute (the chat case is caught above).
      else if (status === 409) setProblem("revising");
      // 20 exports a minute per teacher (DocumentExportResource): a wait, not an error.
      else if (status === 429) setProblem("rateLimited");
      else {
        if (!(error instanceof ExportError) || status >= 500) posthog.captureException(error);
        setProblem("failed");
      }
      return null;
    }
  };

  const run = async (action: Action) => {
    if (pending) return;
    lastActionRef.current = action;
    setProblem(null);
    setPending(action);
    const fmt = format;
    try {
      const files = await ensureFiles(fmt);
      if (!files || !openRef.current) return;
      const ordered = (action === "both" ? VARIANTS : [action])
        .map((v) => files.find((f) => f.variant === v))
        .filter((f): f is ExportFile => !!f);
      for (const [i, file] of ordered.entries()) {
        if (i > 0) await new Promise((r) => setTimeout(r, BOTH_GAP_MS));
        triggerDownload(file);
      }
    } finally {
      setPending(null);
    }
  };

  const upgrade = () => {
    posthog.capture("word_export_upgrade_clicked", { source: "export_dialog" });
    router.push(Routes.CHECKOUT);
  };

  const ext = format === "pdf" ? "pdf" : "docx";
  const showUpsell = problem === "upsell" || isPro === false;
  const blocked = problem === "upsell" && format === "docx";
  const nameFor = (variant: Variant) =>
    fresh?.find((f) => f.variant === variant)?.filename ?? `${PREFIXES[english ? "en" : "pt"][family][variant]} – ${safeTitle(title)}.${ext}`;

  const body = (
    <div className={cn("flex flex-col gap-3", phone && PHONE_TOUCH)}>
      {isPro === null ? (
        // Plan still unknown: no Word upsell for someone who may be Pro.
        <Skeleton className="h-10 w-full rounded-xl" aria-label={t("formatLabel")} />
      ) : (
        <SegmentedControl<Format>
          value={format}
          onChange={(next) => {
            if (pending) return;
            setProblem(null);
            setFormat(next);
          }}
          ariaLabel={t("formatLabel")}
          options={[
            { value: "pdf", label: "PDF" },
            { value: "docx", label: "Word", disabled: !isPro },
          ]}
        />
      )}

      {showUpsell && (
        <button
          type="button"
          onClick={upgrade}
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2.5 text-left text-sm text-amber-800 hover:bg-amber-100 dark:border-amber-700/60 dark:from-amber-950/40 dark:to-yellow-950/40 dark:text-amber-300"
        >
          <span className="inline-flex items-center gap-2.5">
            <Crown className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" />
            <span className="font-medium">{tDownload("exportWordPro")}</span>
          </span>
          <span className="rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200">
            Upgrade
          </span>
        </button>
      )}

      {!blocked && (
        <ul className="flex flex-col gap-2" aria-busy={!!pending}>
          {VARIANTS.map((variant) => {
            const label = t(`files.${family}.${variant}`);
            const busy = pending === variant || pending === "both";
            return (
              <li key={variant} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <span aria-hidden className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold uppercase text-primary">
                  {format === "pdf" ? "PDF" : "DOC"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    {label}
                    <span className="font-normal text-muted-foreground"> · {t(variant === "student" ? "forStudents" : "forYou")}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground" title={nameFor(variant)}>
                    {nameFor(variant)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!!pending}
                  onClick={() => void run(variant)}
                  aria-label={`${t("download")}: ${label}`}
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  {t("download")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {problem && problem !== "upsell" && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {problem === "busy"
              ? t(`busy.${family}`)
              : problem === "revising" || problem === "rateLimited"
                ? t(problem)
                : problem === "saveFailed"
                  ? t("saveFailed")
                  : t("failed")}
          </span>
          {problem !== "busy" && (
            <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 bg-background" onClick={() => void run(lastActionRef.current)}>
              {t("retry")}
            </Button>
          )}
        </div>
      )}

      {!blocked && (
        <Button type="button" className="w-full gap-2" disabled={!!pending} onClick={() => void run("both")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {pending ? t("preparing") : t("downloadBoth")}
        </Button>
      )}
    </div>
  );

  if (phone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" largeClose className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-2xl bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-muted" aria-hidden />
          <SheetTitle className="mb-1 text-base">{t(`title.${family}`)}</SheetTitle>
          <SheetDescription className="mb-3 text-sm">{t("subtitle")}</SheetDescription>
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 sm:max-w-md">
        <DialogTitle className="pr-10 text-base font-semibold">{t(`title.${family}`)}</DialogTitle>
        <DialogDescription className="-mt-1 mb-3 text-sm text-muted-foreground">{t("subtitle")}</DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  );
}
