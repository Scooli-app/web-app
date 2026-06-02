"use client";

/**
 * ImagePickerModal — modal for adding an image to a slide.
 *
 * Three tabs:
 *   1. Gerar com IA  — prompt → AI-generated image (Bloom)
 *   2. Carregar      — upload from PC (drag-drop or click)
 *   3. Por URL       — paste any image URL
 *
 * On confirm the parent receives { url, prompt, backendId? } and is
 * responsible for inserting the canvas element.
 */

import { generateDocumentImage, uploadDocumentImage } from "@/services/api";
import { cn } from "@/shared/utils/utils";
import { Image as ImageIcon, Link2, Loader2, Sparkles, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  documentId,
  onInsert,
}: {
  documentId: string;
  onInsert: (r: ImageInsertResult) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    try {
      const result = await generateDocumentImage(documentId, p);
      if (result.newUrl) {
        onInsert({ url: result.newUrl, prompt: p, backendId: result.id });
      } else {
        toast.error("A imagem ficou em processamento. Tenta novamente.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
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
          disabled={loading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
          }}
          className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Ctrl+Enter para gerar
        </p>
      </div>

      <Button
        onClick={() => void handleGenerate()}
        disabled={!prompt.trim() || loading}
        className="gap-2 self-end"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            A gerar…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar imagem
          </>
        )}
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
            <span className="text-sm">A carregar {selectedFile?.name}…</span>
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
export function ImagePickerModal({ open, documentId, onClose, onInsert }: Props) {
  const [tab, setTab] = useState<Tab>("generate");

  const handleInsert = (result: ImageInsertResult) => {
    onInsert(result);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-primary" />
            Adicionar imagem
          </DialogTitle>
        </DialogHeader>

        {/* Tab strip */}
        <div className="flex gap-1 rounded-lg bg-muted/60 mx-4 mt-3 p-0.5">
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

        {/* Tab content */}
        <div className="min-h-[220px]">
          {tab === "generate" && (
            <GenerateTab documentId={documentId} onInsert={handleInsert} />
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
