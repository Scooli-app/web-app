"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProFeatureCrown from "@/components/ui/pro-feature-crown";
import {
  downloadDocument,
  type DownloadFormat,
} from "@/services/download/documentDownload";
import { useAppSelector } from "@/store/hooks";
import { selectIsPro } from "@/store/subscription/selectors";
import { Download, FileText, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { memo, useCallback, useState } from "react";

interface DownloadButtonProps {
  title: string;
  content: string;
  disabled?: boolean;
}

function DownloadButtonComponent({
  title,
  content,
  disabled,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat | null>(
    null,
  );
  const isProUser = useAppSelector(selectIsPro);

  const handleDownload = useCallback(
    async (format: DownloadFormat) => {
      if (!title || !content) {
        return;
      }

      setIsDownloading(true);
      setDownloadFormat(format);

      try {
        await downloadDocument({ title, content, format });
        posthog.capture("document_downloaded", {
          format,
          document_title: title,
        });
      } catch (error) {
        console.error(`Failed to download as ${format}:`, error);
        posthog.captureException(error);
      } finally {
        setIsDownloading(false);
        setDownloadFormat(null);
      }
    },
    [title, content],
  );

  const handlePdfDownload = useCallback(
    () => handleDownload("pdf"),
    [handleDownload],
  );
  const handleDocxDownload = useCallback(
    () => handleDownload("docx"),
    [handleDownload],
  );

  const isDisabled = disabled || isDownloading || !title || !content;
  const isDocxDisabled = isDownloading || !isProUser;

  return (
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
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={handlePdfDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 cursor-pointer"
        >
          {downloadFormat === "pdf" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
          )}
          <span>Exportar como PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={isProUser ? handleDocxDownload : undefined}
          onSelect={(event) => {
            if (!isProUser) {
              event.preventDefault();
            }
          }}
          disabled={isDownloading}
          aria-disabled={isDocxDisabled}
          className={`flex items-center gap-2 ${
            isProUser
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          {downloadFormat === "docx" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          )}
          <span className="flex-1">Exportar como Word</span>
          {!isProUser && <ProFeatureCrown className="ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const DownloadButton = memo(DownloadButtonComponent);
DownloadButton.displayName = "DownloadButton";

export default DownloadButton;
