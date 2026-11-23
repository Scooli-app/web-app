"use client";

import { SkeletonRows } from "@/components/ui/page-skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { DefaultSourcesSections, DefaultSwitch } from "@/components/sources/DefaultSourcesSections";
import { groupSourceDefaults } from "@/components/sources/groupSourceDefaults";
import { SOURCE_NAME_MAX, clipName, nameLength, type UploadSourceParams } from "@/shared/types/sources";
import { cn } from "@/shared/utils/utils";
import { selectIsUserSourcesEnabled } from "@/store/features/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSourceDefaults, selectSourceDefaults } from "@/store/sources/sourceDefaultsSlice";
import {
  deleteUserSource,
  fetchSources,
  uploadUserSource,
} from "@/store/sources/sourcesSlice";
import { openUpgradeModalForReason } from "@/store/ui/uiSlice";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Lock,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const KNOWN_STATUSES = ["uploaded", "parsing", "chunking", "embedding", "summarising", "indexed", "failed"];

/** `t` must be bound to the "sources.status" namespace. */
function statusLabel(status: string, t: ReturnType<typeof useTranslations>): string {
  return KNOWN_STATUSES.includes(status) ? t(`${status}`) : status;
}

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
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
      {statusLabel(status, t)}
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SourcesPage() {
  const t = useTranslations("sources.page");
  const tStatus = useTranslations("sources.status");
  const tList = useTranslations("sources.list");
  const dispatch = useAppDispatch();
  const { sources, loading, error, uploading, uploadError } = useAppSelector(
    (state) => state.sources,
  );

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaults = useAppSelector(selectSourceDefaults);
  const { personalByRef } = useMemo(() => groupSourceDefaults(defaults), [defaults]);
  const { limits, loading: limitsLoading } = usePlanLimits();
  // Fail open like usePlanLimits: unknown limits show the form, the server still enforces Pro.
  const isFree = limits ? !limits.isPro : false;
  // A school member without user_sources gets the school sections only: the personal endpoints follow that flag.
  const isUserSourcesEnabled = useAppSelector(selectIsUserSourcesEnabled);

  useEffect(() => {
    dispatch(fetchSourceDefaults());
  }, [dispatch]);

  useEffect(() => {
    if (isUserSourcesEnabled) dispatch(fetchSources());
  }, [dispatch, isUserSourcesEnabled]);

  const validateAndSetFile = useCallback(
    (selectedFile: File): boolean => {
      setFile(selectedFile);
      if (!name) setName(clipName(selectedFile.name.replace(/\.[^.]+$/, "")));
      return true;
    },
    [name],
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
    }
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteUserSource(id));
    setDeleteConfirmId(null);
  };

  return (
    <div className="w-full max-w-3xl space-y-8 py-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">{t("defaultsTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("defaultsDescription")}</p>
        </div>
      </div>

      <DefaultSourcesSections />

      {/* One block for the teacher's own sources: heading, then the upload (Pro) or what Pro unlocks, then the list. */}
      {isUserSourcesEnabled && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {t("yours")}
              {sources.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({sources.length})
                </span>
              )}
            </h2>
            {sources.some((s) => !["indexed", "failed"].includes(s.status)) && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />{t("processingBadge")}
              </span>
            )}
          </div>

          {/* Free teachers see what Pro unlocks instead of a form the server refuses. */}
          {limitsLoading ? null : isFree ? (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 space-y-3">
                  <div>
                    <h3 className="text-base font-semibold">{t("proTitle")}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t("proDescription")}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => dispatch(openUpgradeModalForReason("sources_pro"))}
                  >
                    {t("proAction")}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 space-y-4">
              {/* Drop zone: the one upload entry, so it is a keyboard control too. */}
              <div
                role="button"
                tabIndex={0}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) validateAndSetFile(f);
                }}
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="line-clamp-2 break-all text-sm font-medium" title={file?.name}>
                    {file ? file.name : t("dropzoneEmpty")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file ? formatSize(file.size) : t("dropzoneHint")}
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

              {/* Name + upload — only shown after a file is chosen */}
              {file && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      placeholder={t("namePlaceholder")}
                      aria-label={t("namePlaceholder")}
                      value={name}
                      maxLength={SOURCE_NAME_MAX * 2}
                      onChange={(e) => setName(clipName(e.target.value))}
                      className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground" aria-hidden>
                      {nameLength(name)}/{SOURCE_NAME_MAX}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleUpload()}
                    disabled={uploading || !name.trim()}
                    className="flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? t("uploading") : t("upload")}
                  </button>
                </div>
              )}

              {uploadError && (
                <p className="flex items-center gap-1.5 break-words text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {uploadError}
                </p>
              )}
            </Card>
          )}

          {/* The list (free teachers only see it if they still have sources from a past Pro plan) */}
          {(!isFree || sources.length > 0) && (
            <>
              {loading && sources.length === 0 && <SkeletonRows rows={3} />}

              {!loading && sources.length === 0 && error && (
                <LoadError onRetry={() => dispatch(fetchSources())} />
              )}

              {!loading && sources.length === 0 && !error && (
                <EmptyState
                  icon={FileText}
                  title={t("emptyState")}
                  description={t("emptyDescription")}
                  actions={
                    <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-1.5 h-4 w-4" />
                      {t("emptyAction")}
                    </Button>
                  }
                />
              )}

              {sources.map((source) => (
                <Card key={source.id} className="p-4">
                  {/* On a phone the badge, switch and bin go under the name, so the name keeps the width. */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 break-words text-sm font-medium" title={source.name}>
                          {source.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatSize(source.fileSizeBytes)}
                          {source.chunkCount > 0 &&
                            ` · ${tList("excerptCount", { count: source.chunkCount })}`}
                          {` · ${source.fileKind.toUpperCase()}`}
                        </p>
                        {source.strippedBackMatter &&
                          source.strippedBackMatter.charsRemoved > 0 && (
                            <p
                              className="mt-1 text-xs text-muted-foreground"
                              title={t("strippedBackMatterTooltip", {
                                size: formatSize(source.strippedBackMatter.charsRemoved),
                                heading:
                                  source.strippedBackMatter.matchedHeading ??
                                  t("backMatterFallback"),
                              })}
                            >
                              {t("strippedSectionOmitted", {
                                heading:
                                  source.strippedBackMatter.matchedHeading ??
                                  t("sectionFallback"),
                              })}
                            </p>
                          )}
                        {/* The raw parser error stays in the server logs; teachers get the next step. */}
                        {source.status === "failed" && (
                          <p className="mt-1 text-xs text-destructive">{t("failedHint")}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 pl-8 sm:pl-0">
                      <StatusBadge status={source.status} t={tStatus} />
                      {personalByRef[source.id] && <DefaultSwitch entry={personalByRef[source.id]} />}

                      {deleteConfirmId === source.id ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(source.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-destructive ring-1 ring-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                          >
                            {t("confirm")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={t("deleteAriaLabel")}
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
            </>
          )}
        </section>
      )}
    </div>
  );
}
