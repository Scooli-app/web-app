"use client";

import { Card } from "@/components/ui/card";
import { getSourceQuota } from "@/services/api/sources.service";
import type { SourceQuota, UploadSourceParams } from "@/shared/types/sources";
import { cn } from "@/shared/utils/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteUserSource,
  fetchSources,
  uploadUserSource,
} from "@/store/sources/sourcesSlice";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function statusLabel(status: string): string {
  switch (status) {
    case "uploaded":
      return "A processar";
    case "parsing":
      return "A ler ficheiro";
    case "chunking":
      return "A segmentar";
    case "embedding":
      return "A indexar";
    case "indexed":
      return "Indexado";
    case "failed":
      return "Falhou";
    default:
      return status;
  }
}

function StatusBadge({ status }: { status: string }) {
  const isPending = !["indexed", "failed"].includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "indexed" &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "failed" &&
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        isPending &&
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      )}
    >
      {status === "indexed" && <CheckCircle2 className="w-3 h-3" />}
      {status === "failed" && <AlertCircle className="w-3 h-3" />}
      {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
      {statusLabel(status)}
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function QuotaBar({ quota }: { quota: SourceQuota }) {
  const bytesPct = Math.min(
    100,
    quota.bytesMax > 0
      ? Math.round((quota.bytesUsed / quota.bytesMax) * 100)
      : 0,
  );
  const filesPct = Math.min(
    100,
    quota.filesMax > 0
      ? Math.round((quota.filesUsed / quota.filesMax) * 100)
      : 0,
  );
  const isNearLimit = bytesPct >= 80 || filesPct >= 80;
  const isAtLimit = bytesPct >= 100 || filesPct >= 100;

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">
          {formatSize(quota.bytesUsed)} de {formatSize(quota.bytesMax)} usados
        </span>
        <span className="text-muted-foreground">
          {quota.filesUsed} / {quota.filesMax} ficheiros
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all",
            isAtLimit
              ? "bg-destructive"
              : isNearLimit
                ? "bg-amber-500"
                : "bg-primary",
          )}
          style={{ width: `${Math.max(bytesPct, filesPct)}%` }}
        />
      </div>
    </div>
  );
}

export default function SourcesPage() {
  const dispatch = useAppDispatch();
  const { sources, loading, uploading, uploadError } = useAppSelector(
    (state) => state.sources,
  );

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [quota, setQuota] = useState<SourceQuota | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-fetch on mount so navigating to this page always shows fresh state.
  // Polling of pending sources is handled globally by SourceIngestionTracker
  // (mounted in SidebarLayout) so the rest of the app stays in sync too.
  useEffect(() => {
    dispatch(fetchSources());
  }, [dispatch]);

  const refreshQuota = useCallback(async () => {
    try {
      const q = await getSourceQuota();
      setQuota(q);
    } catch {
      // Soft-fail: keep the previous quota snapshot (or null if first load).
    }
  }, []);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  // Re-fetch quota whenever the sources list changes (upload/delete/ingest).
  // The amount of pending bytes doesn't change as ingestion progresses, but
  // count/bytes do change on add/remove, so keying on sources is enough.
  useEffect(() => {
    void refreshQuota();
  }, [sources.length, refreshQuota]);

  const maxFileBytes = quota?.maxFileBytes ?? 25 * 1024 * 1024;

  const validateAndSetFile = useCallback(
    (selectedFile: File): boolean => {
      if (selectedFile.size > maxFileBytes) {
        toast.error(
          `O ficheiro excede o limite de ${formatSize(maxFileBytes)}.`,
        );
        return false;
      }
      if (quota && quota.filesUsed >= quota.filesMax) {
        toast.error(
          `Atingiu o limite de ${quota.filesMax} fontes. Remova uma para carregar outra.`,
        );
        return false;
      }
      if (quota && quota.bytesUsed + selectedFile.size > quota.bytesMax) {
        const remaining = Math.max(0, quota.bytesMax - quota.bytesUsed);
        toast.error(
          `Espaço insuficiente. Restam ${formatSize(remaining)} do total de ${formatSize(quota.bytesMax)}.`,
        );
        return false;
      }
      setFile(selectedFile);
      if (!name) setName(selectedFile.name.replace(/\.[^.]+$/, ""));
      return true;
    },
    [maxFileBytes, name, quota],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      const accepted = validateAndSetFile(f);
      if (!accepted && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) return;
    const params: UploadSourceParams = {
      file,
      name: name.trim(),
    };
    const result = await dispatch(uploadUserSource(params));
    if (uploadUserSource.fulfilled.match(result)) {
      setFile(null);
      setName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      void refreshQuota();
    }
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteUserSource(id));
    setDeleteConfirmId(null);
    void refreshQuota();
  };

  return (
    <div className="w-full max-w-3xl space-y-8 py-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">As Minhas Fontes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carregue documentos (PDF, DOCX) para enriquecer a geração de conteúdo
          com o seu próprio contexto curricular.
        </p>
      </div>

      {/* Upload card */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold">Adicionar Fonte</h2>

        {/* Drop zone */}
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) validateAndSetFile(f);
          }}
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {file ? file.name : "Clique ou arraste um ficheiro"}
            </p>
            <p className="text-xs text-muted-foreground">
              {file
                ? formatSize(file.size)
                : `PDF ou DOCX, até ${formatSize(maxFileBytes)}`}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Quota usage */}
        {quota && <QuotaBar quota={quota} />}

        {/* Name + upload — only shown after a file is chosen */}
        {file && (
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nome da fonte *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading || !name.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "A carregar..." : "Carregar"}
            </button>
          </div>
        )}

        {uploadError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {uploadError}
          </p>
        )}
      </Card>

      {/* Sources list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Fontes carregadas
            {sources.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({sources.length})
              </span>
            )}
          </h2>
          {sources.some((s) => !["indexed", "failed"].includes(s.status)) && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />A processar...
            </span>
          )}
        </div>

        {loading && sources.length === 0 && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />A carregar fontes...
          </div>
        )}

        {!loading && sources.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <FileText className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ainda nao tem fontes carregadas.
            </p>
          </Card>
        )}

        {sources.map((source) => (
          <Card key={source.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{source.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(source.fileSizeBytes)}
                    {source.chunkCount > 0 &&
                      ` · ${source.chunkCount} excertos`}
                    {` · ${source.fileKind.toUpperCase()}`}
                  </p>
                  {source.strippedBackMatter &&
                    source.strippedBackMatter.charsRemoved > 0 && (
                      <p
                        className="mt-1 text-xs text-muted-foreground"
                        title={`Excluímos ${formatSize(source.strippedBackMatter.charsRemoved)} de ${source.strippedBackMatter.matchedHeading ?? "back-matter"} antes de processar.`}
                      >
                        Secção {source.strippedBackMatter.matchedHeading ?? "final"} omitida
                      </p>
                    )}
                  {source.status === "failed" && source.lastError && (
                    <p className="mt-1 truncate text-xs text-destructive">
                      {source.lastError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={source.status} />

                {deleteConfirmId === source.id ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void handleDelete(source.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-destructive ring-1 ring-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Eliminar fonte"
                    onClick={() => setDeleteConfirmId(source.id)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pro info note */}
      <p className="text-xs text-muted-foreground">
        As fontes ficam disponíveis apenas para as suas gerações. O conteúdo é
        processado e indexado automaticamente em segundo plano.
      </p>
    </div>
  );
}
