"use client";

/**
 * ImagePickerModal â€” modal for adding an image to a slide.
 *
 * Three tabs:
 *   1. Gerar com IA  â€” prompt â†’ AI-generated image (Bloom)
 *   2. Carregar      â€” upload from PC (drag-drop or click)
 *   3. Por URL       â€” paste any image URL
 *
 * On confirm the parent receives { url, prompt, backendId? } and is
 * responsible for inserting the canvas element.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadDocumentImage } from "@/services/api";
import { cn } from "@/shared/utils/utils";
import { Image as ImageIcon, Link2, Loader2, Sparkles, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/* --------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

type Tab = "generate" | "upload" | "url";

export interface ImageInsertResult {
  url: string;
  prompt: string;
  backendId?: string;
}

interface Props {
  open: boolean;
  documentId: string;
  onClose: () => void;
  onInsert: (result: ImageInsertResult) => void;
  onGenerate: (prompt: string) => void;
}

/* --------------------------------------------------------------------------
 * Tab button helper
 * -------------------------------------------------------------------------- */
function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* --------------------------------------------------------------------------
 * Generate tab
 * -------------------------------------------------------------------------- */
function GenerateTab({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    const p = prompt.trim();
    if (!p) return;
    onClose();
    onGenerate(p);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          Descreve a imagem
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: uma pizza dividida em 6 partes iguais, estilo cartoon colorido para crianças"
          rows={4}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
          }}
          className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Ctrl+Enter para gerar
        </p>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim()}
        className="gap-2 self-end"
      >
        <Sparkles className="h-4 w-4" />
        Gerar imagem
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Upload tab
 * -------------------------------------------------------------------------- */
function UploadTab({
  documentId,
  onInsert,
}: {
  documentId: string;
  onInsert: (r: ImageInsertResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setLoading(true);
      try {
        const result = await uploadDocumentImage(documentId, file, file.name);
        if (result.image?.url) {
          onInsert({ url: result.image.url, prompt: file.name, backendId: result.image.id });
        } else {
          toast.error("Erro ao carregar imagem");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar imagem");
        setLoading(false);
        setSelectedFile(null);
      }
    },
    [documentId, onInsert],
  );

  return (
    <div className="p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "flex h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
          dragging
            ? "border-primary bg-primary/5 text-primary"
            : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:bg-muted/40",
          loading && "pointer-events-none opacity-60",
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">A carregar {selectedFile?.name}â€¦</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Clica ou arrasta uma imagem
              </p>
              <p className="mt-0.5 text-xs">PNG, JPG, WEBP até 10 MB</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * URL tab
 * -------------------------------------------------------------------------- */
function UrlTab({ onInsert }: { onInsert: (r: ImageInsertResult) => void }) {
  const [url, setUrl] = useState("");

  const handleInsert = () => {
    const u = url.trim();
    if (!u) return;
    onInsert({ url: u, prompt: "" });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          URL da imagem
        </label>
        <input
          type="url"
          value={url}
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleInsert(); }}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <Button
        onClick={handleInsert}
        disabled={!url.trim()}
        className="gap-2 self-end"
      >
        <Link2 className="h-4 w-4" />
        Inserir imagem
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Main modal
 * -------------------------------------------------------------------------- */
export function ImagePickerModal({ open, documentId, onClose, onInsert, onGenerate }: Props) {
  const [tab, setTab] = useState<Tab>("generate");

  const handleInsert = (result: ImageInsertResult) => {
    onInsert(result);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 pb-0 pt-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-primary" />
            Adicionar imagem
          </DialogTitle>
        </DialogHeader>

        <div className="mx-4 mt-3 flex gap-1 rounded-lg bg-muted/60 p-0.5">
          <TabBtn
            active={tab === "generate"}
            onClick={() => setTab("generate")}
            icon={Sparkles}
            label="Gerar com IA"
          />
          <TabBtn
            active={tab === "upload"}
            onClick={() => setTab("upload")}
            icon={Upload}
            label="Carregar"
          />
          <TabBtn
            active={tab === "url"}
            onClick={() => setTab("url")}
            icon={Link2}
            label="Por URL"
          />
        </div>

        <div className="min-h-[220px]">
          {tab === "generate" && (
            <GenerateTab onClose={onClose} onGenerate={onGenerate} />
          )}
          {tab === "upload" && (
            <UploadTab documentId={documentId} onInsert={handleInsert} />
          )}
          {tab === "url" && (
            <UrlTab onInsert={handleInsert} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
