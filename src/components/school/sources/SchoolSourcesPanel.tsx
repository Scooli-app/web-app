"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
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
import { ApiRequestError } from "@/services/api/client";
import {
  deleteSchoolSource,
  getSchoolSourceQuota,
  listSchoolSources,
  updateSchoolSource,
} from "@/services/api/school-sources.service";
import type { SchoolSource, SchoolSourceQuota } from "@/shared/types/sources";
import { FileText, MoreHorizontal, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SchoolSourceDialog } from "./SchoolSourceDialog";
import { formatQuota, formatTags, isSettled } from "./schoolSourceFormat";

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

  // A 409 (still indexing) answers with a message already in the teacher's language.
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e) {
      toast.error((e instanceof ApiRequestError && e.message) || t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

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
        <Button type="button" onClick={() => setDialog({ mode: "create" })} className="w-full sm:w-auto">
          <Plus className="size-4" aria-hidden />
          {t("add")}
        </Button>
      </div>

      <div className="mt-6">
        {failed && sources === null ? (
          <LoadError message={t("errors.load")} onRetry={() => void load()} />
        ) : sources === null ? (
          <SkeletonRows rows={3} />
        ) : sources.length === 0 ? (
          <EmptyState size="inline" icon={FileText} title={t("title")} description={t("empty")} />
        ) : (
          <ul className="divide-y divide-border/70">
            {sources.map((s) => {
              const settled = isSettled(s.status);
              return (
                <li key={s.id} data-testid="school-source-row" className="flex items-start gap-3 py-3">
                  {/* On a phone the badge drops under the text, so the name and tags keep the width. */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words font-medium" title={s.name}>
                        {s.name}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">
                        {t(`type.${s.type}.title`)} · {formatTags(s.subjects, s.schoolYears, t)}
                      </p>
                    </div>
                    <Badge
                      variant={s.status === "indexed" && s.defaultEnabled ? "default" : "outline"}
                      className="shrink-0 self-start sm:self-auto"
                    >
                      {statusLine(s)}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={t("menu.actions", { name: s.name })}>
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
