"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadError } from "@/components/ui/load-error";
import { SkeletonRows } from "@/components/ui/page-skeleton";
import {
  deleteSchoolSource,
  getSchoolSourceQuota,
  listSchoolSources,
  updateSchoolSource,
} from "@/services/api/school-sources.service";
import type { SchoolSource, SchoolSourceQuota } from "@/shared/types/sources";
import { cn } from "@/shared/utils/utils";
import { BookOpen, FileText, Loader2, MoreHorizontal, Plus, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SchoolSourceDialog } from "./SchoolSourceDialog";
import { formatQuota, formatScope, formatSize, isSettled, schoolSourceError } from "./schoolSourceFormat";

const POLL_MS = 5000;

type DialogState = { mode: "create" } | { mode: "edit"; source: SchoolSource } | null;

/** Gestão → Fontes da escola: the documents every teacher of the school receives. */
export function SchoolSourcesPanel() {
  const t = useTranslations("schoolSources");
  const [sources, setSources] = useState<SchoolSource[] | null>(null);
  const [quota, setQuota] = useState<SchoolSourceQuota | null>(null);
  const [failed, setFailed] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleting, setDeleting] = useState<SchoolSource | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, q] = await Promise.all([listSchoolSources(), getSchoolSourceQuota()]);
      setSources(list);
      setQuota(q);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const indexing = sources?.some((s) => !isSettled(s.status)) ?? false;
  useEffect(() => {
    if (!indexing) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [indexing, load]);

  // On a refusal (409 still indexing, 404 deleted by another admin) the list reloads too, so it shows the real state.
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e) {
      toast.error(schoolSourceError(e, t));
      await load();
    } finally {
      setBusy(false);
    }
  };

  // The server refuses an upload at either limit; say so before the admin picks a file.
  const quotaFull = quota
    ? quota.filesUsed >= quota.filesMax
      ? t("quotaFull.files", { max: quota.filesMax })
      : quota.bytesUsed >= quota.bytesMax
        ? t("quotaFull.bytes", { max: formatSize(quota.bytesMax, t) })
        : null
    : null;

  const statusLine = (s: SchoolSource) =>
    s.status === "indexed"
      ? s.defaultEnabled
        ? t("onForAll")
        : t("offByDefault")
      : s.status === "failed"
        ? t("status.failed")
        : t("status.indexing");

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
          {quota && <p className="text-sm text-muted-foreground">{formatQuota(quota, t)}</p>}
        </div>
        <div className="flex flex-col gap-1.5 sm:max-w-64 sm:items-end">
          <Button
            type="button"
            onClick={() => setDialog({ mode: "create" })}
            disabled={quotaFull !== null}
            aria-describedby={quotaFull ? "school-sources-quota-full" : undefined}
            className="w-full sm:w-auto"
          >
            <Plus className="size-4" aria-hidden />
            {t("add")}
          </Button>
          {quotaFull && (
            <p id="school-sources-quota-full" className="text-xs text-muted-foreground sm:text-right">
              {quotaFull}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        {failed && sources === null ? (
          <LoadError message={t("errors.load")} onRetry={() => void load()} />
        ) : sources === null ? (
          <SkeletonRows rows={3} />
        ) : sources.length === 0 ? (
          <EmptyState size="inline" icon={FileText} title={t("title")} description={t("empty")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sources.map((s) => {
              const settled = isSettled(s.status);
              const scope = formatScope(s.subjects, s.schoolYears, t);
              const TypeIcon = s.type === "regra" ? ScrollText : BookOpen;
              return (
                <li
                  key={s.id}
                  data-testid="school-source-card"
                  className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
                      <TypeIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words font-medium leading-snug" title={s.name}>
                        {s.name}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{t(`type.${s.type}.title`)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          aria-label={t("menu.actions", { name: s.name })}
                          className="-mr-2 -mt-1.5 shrink-0"
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!settled} onSelect={() => setDialog({ mode: "edit", source: s })}>
                          {t("menu.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!settled}
                          onSelect={() => void run(() => updateSchoolSource(s.id, { defaultEnabled: !s.defaultEnabled }))}
                        >
                          {s.defaultEnabled ? t("menu.turnOff") : t("menu.turnOn")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!settled}
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setDeleting(s)}
                        >
                          {t("menu.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-auto space-y-2 border-t border-border/70 pt-3">
                    <p className="truncate text-sm" title={scope}>
                      {scope}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      {settled ? (
                        <span
                          aria-hidden
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            s.status === "failed"
                              ? "bg-destructive"
                              : s.defaultEnabled
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40",
                          )}
                        />
                      ) : (
                        <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
                      )}
                      <span className={cn(s.status === "failed" && "font-medium text-destructive")}>{statusLine(s)}</span>
                    </p>
                    {s.status === "failed" && <p className="text-xs text-destructive">{t("status.failedHint")}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {dialog && (
        <SchoolSourceDialog
          mode={dialog.mode}
          source={dialog.mode === "edit" ? dialog.source : undefined}
          maxFileBytes={quota?.maxFileBytes}
          onDone={(changed) => {
            setDialog(null);
            if (changed) void load();
          }}
        />
      )}
      <ConfirmationDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void run(() => deleteSchoolSource(deleting.id)).then(() => setDeleting(null));
        }}
        title={t("menu.delete")}
        description={deleting ? t("deleteConfirm", { name: deleting.name }) : undefined}
        confirmLabel={t("menu.delete")}
        variant="danger"
        isLoading={busy}
      />
    </PageContainer>
  );
}
