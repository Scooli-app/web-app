"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadDocument, type DownloadFormat } from "@/services/download/documentDownload";
import { Download, FileText, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";

interface DownloadButtonProps {
  title: string;
  content: string;
  disabled?: boolean;
}

function DownloadButtonComponent({ title, content, disabled }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat | null>(null);

  const handleDownload = useCallback(
    async (format: DownloadFormat) => {
      if (!title || !content) {
        return;
      }

      setIsDownloading(true);
      setDownloadFormat(format);

      try {
        await downloadDocument({ title, content, format });
      } catch (error) {
        console.error(`Failed to download as ${format}:`, error);
        alert(`Erro ao exportar como ${format.toUpperCase()}. Tente novamente.`);
      } finally {
        setIsDownloading(false);
        setDownloadFormat(null);
      }
    },
    [title, content]
  );

  const handlePdfDownload = useCallback(() => handleDownload("pdf"), [handleDownload]);
  const handleDocxDownload = useCallback(() => handleDownload("docx"), [handleDownload]);

  const isDisabled = disabled || isDownloading || !title || !content;

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
          onClick={handleDocxDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 cursor-pointer"
        >
          {downloadFormat === "docx" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          )}
          <span>Exportar como Word</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const DownloadButton = memo(DownloadButtonComponent);
DownloadButton.displayName = "DownloadButton";

export default DownloadButton;
