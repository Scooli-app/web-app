"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FilePlus2,
  FileText,
  HardDrive,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeatureFlag } from "@/shared/types/featureFlags";
import { Routes } from "@/shared/types";
import type { UserSource, UserSourceStatus } from "@/shared/types/userSource";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store/store";
import {
  clearUserSourcesError,
  fetchUserSources,
  removeUserSource,
  uploadUserSource,
} from "@/store/user-sources/userSourcesSlice";
import {
  selectHasPendingSources,
  selectUserSources,
  selectUserSourcesError,
  selectUserSourcesLoading,
  selectUserSourcesUploading,
} from "@/store/user-sources/selectors";

const STATUS_CONFIG: Record<
  UserSourceStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    spin?: boolean;
  }
> = {
  uploaded: {
    label: "A aguardar",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
  },
  parsing: {
    label: "A processar",
    icon: Loader2,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30",
    spin: true,
  },
  chunking: {
    label: "A dividir",
    icon: Loader2,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30",
    spin: true,
  },
  embedding: {
    label: "A indexar",
    icon: Loader2,
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/30",
    spin: true,
  },
  indexed: {
    label: "Disponível",
    icon: CheckCircle2,
    className:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30",
  },
  failed: {
    label: "Falhou",
    icon: AlertCircle,
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30",
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function SourceCard({
  source,
  onDelete,
}: {
  source: UserSource;
  onDelete: (id: string) => void;
}) {
  const config = STATUS_CONFIG[source.status];
  const StatusIcon = config.icon;

  return (
    <Card className="p-4 border-border hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm text-foreground truncate">
              {source.name}
            </p>
            <button
              type="button"
              onClick={() => onDelete(source.id)}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Eliminar recurso"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 flex items-center gap-1 ${config.className}`}
            >
              <StatusIcon
                className={`w-3 h-3 ${config.spin ? "animate-spin" : ""}`}
              />
              {config.label}
            </Badge>
            {source.subject && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {source.subject}
              </Badge>
            )}
            {source.schoolYear && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {source.schoolYear}º ano
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {source.fileKind.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatBytes(source.fileSizeBytes)}
            </span>
            {source.status === "indexed" && source.chunkCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {source.chunkCount} secções
              </span>
            )}
          </div>
          {source.status === "failed" && source.lastError && (
            <p className="text-xs text-destructive mt-1.5 line-clamp-2">
              {source.lastError}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function UserSourcesPage() {
  const dispatch = useAppDispatch();
  const sources = useAppSelector(selectUserSources);
  const loading = useAppSelector(selectUserSourcesLoading);
  const uploading = useAppSelector(selectUserSourcesUploading);
  const error = useAppSelector(selectUserSourcesError);
  const hasPending = useAppSelector(selectHasPendingSources);
  const features = useSelector((state: RootState) => state.features.flags);
  const isUserSourcesEnabled = features[FeatureFlag.USER_SOURCES] === true;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    dispatch(fetchUserSources());
  }, [dispatch]);

  useEffect(() => {
    if (hasPending) {
      pollingRef.current = setInterval(() => {
        dispatch(fetchUserSources());
      }, 5000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [hasPending, dispatch]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      await dispatch(
        uploadUserSource({
          file,
          name: file.name.replace(/\.[^/.]+$/, ""),
        })
      );
    },
    [dispatch]
  );

  const handleDelete = useCallback(
    (id: string) => {
      dispatch(removeUserSource(id));
    },
    [dispatch]
  );

  if (!isUserSourcesEnabled) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <Card className="p-8 text-center border-dashed border-2 border-border">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mx-auto mb-4">
            <HardDrive className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Os meus recursos
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Carrega os teus documentos e utiliza-os como contexto na geração de
            conteúdo. Esta funcionalidade está disponível no plano Pro.
          </p>
          <Link href={Routes.CHECKOUT}>
            <Button>Atualizar para Pro</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Os meus recursos
            </h1>
            <p className="text-sm text-muted-foreground">
              Documentos usados como contexto na geração de conteúdo
            </p>
          </div>
        </div>
        <Button
          onClick={handleUploadClick}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? "A enviar..." : "Carregar ficheiro"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.md"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => dispatch(clearUserSourcesError())}
            className="text-xs underline hover:no-underline shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {loading && sources.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : sources.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2 border-border">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mx-auto mb-4">
            <FilePlus2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Nenhum recurso carregado
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Carrega PDFs ou documentos Word para que a IA os use como contexto
            ao gerar conteúdo.
          </p>
          <Button
            variant="outline"
            onClick={handleUploadClick}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Carregar primeiro ficheiro
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Formatos suportados: PDF, DOCX, Markdown · Tamanho máximo: 50 MB por
        ficheiro
      </p>
    </div>
  );
}
