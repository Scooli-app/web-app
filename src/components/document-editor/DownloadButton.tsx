"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpgradeLimitError } from "@/services/api/client";
import { downloadDocument, type DownloadFormat } from "@/services/download/documentDownload";
import { Routes } from "@/shared/types";
import type { DocumentImage } from "@/shared/types/document";
import { Crown, Download, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { memo, useCallback, useRef, useState } from "react";
import posthog from "posthog-js";

interface DownloadButtonProps {
  title: string;
  content: string;
  images: DocumentImage[];
  isProUser?: boolean;
  disabled?: boolean;
  /** Tooltip explaining why the button is disabled. */
  disabledReason?: string;
}

function DownloadButtonComponent({
  title,
  content,
  images,
  isProUser = false,
  disabled,
  disabledReason,
}: DownloadButtonProps) {
  const t = useTranslations("editor.downloadButton");
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat | null>(null);
  // React state updates are batched/async, so a user clicking (or hitting Enter on a
  // focused menu item) twice within the same tick can call handleDownload twice before
  // `isDownloading` re-renders true — each call hits /api/download and fires its own
  // `document_downloaded`, double-counting one logical download. A ref guard is set
  // synchronously, before the first `await`, so the second call sees it immediately.
  const inFlightRef = useRef(false);

  const handleDownload = useCallback(
    async (format: DownloadFormat) => {
      if (!title || !content) {
        return;
      }
      if (format === "docx" && !isProUser) {
        return;
      }
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;

      setIsDownloading(true);
      setDownloadFormat(format);

      try {
        // `document_downloaded` is captured server-side by /api/download.
        await downloadDocument({ title, content, format, images });
      } catch (error) {
        console.error(`Failed to download as ${format}:`, error);
        if (!(error instanceof UpgradeLimitError)) {
          posthog.captureException(error);
        }
      } finally {
        inFlightRef.current = false;
        setIsDownloading(false);
        setDownloadFormat(null);
      }
    },
    [title, content, images, isProUser]
  );

  const handlePdfDownload = useCallback(() => handleDownload("pdf"), [handleDownload]);
  const handleDocxDownload = useCallback(() => handleDownload("docx"), [handleDownload]);
  const handleUpgradeToPro = useCallback(() => {
    posthog.capture("word_export_upgrade_clicked", {
      source: "download_menu",
    });
    router.push(Routes.CHECKOUT);
  }, [router]);

  const isDisabled = disabled || isDownloading || !title || !content;
  const isDocxDisabled = isDownloading;

  return (
    <span title={isDisabled ? disabledReason : undefined} className="inline-flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            disabled={isDisabled}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isDownloading ? t("exporting") : t("export")}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[18rem] p-1.5">
          <DropdownMenuItem
            onClick={handlePdfDownload}
            disabled={isDownloading}
            className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-[15px] leading-none whitespace-nowrap"
          >
            {downloadFormat === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
            )}
            <span className="whitespace-nowrap">
              {downloadFormat === "pdf" ? t("generatingPdf") : t("exportPdf")}
            </span>
          </DropdownMenuItem>
          {isProUser ? (
            <DropdownMenuItem
              onClick={handleDocxDownload}
              disabled={isDocxDisabled}
              className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-[15px] leading-none whitespace-nowrap"
            >
              {downloadFormat === "docx" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              )}
              <span className="whitespace-nowrap">
                {downloadFormat === "docx" ? t("generatingWord") : t("exportWord")}
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={handleUpgradeToPro}
              className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2.5 text-[15px] leading-none whitespace-nowrap text-amber-800 focus:bg-amber-100 dark:border-amber-700/60 dark:from-amber-950/40 dark:to-yellow-950/40 dark:text-amber-300"
            >
              <span className="inline-flex items-center gap-2.5">
                <Crown className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                <span className="font-medium whitespace-nowrap">{t("exportWordPro")}</span>
              </span>
              <span className="ml-auto rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200">
                Upgrade
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

const DownloadButton = memo(DownloadButtonComponent);
DownloadButton.displayName = "DownloadButton";

export default DownloadButton;
