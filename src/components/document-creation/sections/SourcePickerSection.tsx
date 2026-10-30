"use client";

import { OptionRow } from "./FormCard";
import { listRegulatorySources } from "@/services/api/sources.service";
import { Routes } from "@/shared/types/routes";
import type { UserSource } from "@/shared/types/sources";
import { cn } from "@/shared/utils/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsContextPipelineV2Enabled } from "@/store/features/selectors";
import { fetchSources } from "@/store/sources/sourcesSlice";
import { AlertCircle, Check, ExternalLink, Loader2, Scale, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormUpdateFn } from "../types";

interface SourcePickerSectionProps {
  sourceIds: string[];
  includeAe: boolean;
  regulatorySourceIds?: string[];
  subject?: string;
  schoolYear?: number;
  onUpdate: FormUpdateFn;
}

export function SourcePickerSection({
  sourceIds,
  includeAe,
  regulatorySourceIds,
  subject,
  schoolYear,
  onUpdate,
}: SourcePickerSectionProps) {
  const t = useTranslations("documentCreation.sourcePicker");
  const dispatch = useAppDispatch();
  const { sources, loading } = useAppSelector((state) => state.sources);
  const isContextPipelineV2Enabled = useAppSelector(selectIsContextPipelineV2Enabled);

  const [regulatorySources, setRegulatorySources] = useState<UserSource[]>([]);
  const [regulatoryLoading, setRegulatoryLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchSources());
  }, [dispatch]);

  useEffect(() => {
    if (!isContextPipelineV2Enabled) {
      setRegulatoryLoading(false);
      return;
    }

    let cancelled = false;
    setRegulatoryLoading(true);
    listRegulatorySources()
      .then((data) => {
        if (cancelled) return;
        setRegulatorySources(data);
        // Default: pre-select everything so behavior matches today's auto-injection,
        // but only if the form hasn't been initialised yet (regulatorySourceIds is undefined).
        if (regulatorySourceIds === undefined && data.length > 0) {
          onUpdate(
            "regulatorySourceIds",
            data.map((s) => s.id),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRegulatorySources([]);
      })
      .finally(() => {
        if (!cancelled) setRegulatoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContextPipelineV2Enabled]);

  const indexedSources = sources.filter(
    (s) =>
      s.status === "indexed" &&
      (!subject || !s.subject || s.subject === subject) &&
      (!schoolYear || !s.schoolYear || s.schoolYear === schoolYear),
  );

  const toggleSource = (id: string) => {
    const next = sourceIds.includes(id)
      ? sourceIds.filter((s) => s !== id)
      : [...sourceIds, id];
    onUpdate("sourceIds", next);
  };

  const toggleRegulatory = (id: string) => {
    const current = regulatorySourceIds ?? [];
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    onUpdate("regulatorySourceIds", next);
  };

  return (
    <OptionRow label={t("title")}>
      <div className="space-y-2">
        {/* AE toggle and the way to the teacher's own sources, on one line. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onUpdate("includeAe", !includeAe)}
            role="checkbox"
            aria-checked={includeAe}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              includeAe ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            {includeAe && <Check className="h-3 w-3" aria-hidden />}
            {t("includeAe")}
            <span className="font-normal text-muted-foreground">· {t("recommended")}</span>
          </button>
          <Link
            href={Routes.SOURCES}
            className="flex shrink-0 items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("manageSources")}
          </Link>
        </div>

        {/* Regulatory documents (scooli-managed) — only shown when context_pipeline_v2 is enabled */}
        {isContextPipelineV2Enabled && regulatoryLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("loadingRegulatory")}
          </div>
        ) : isContextPipelineV2Enabled && regulatorySources.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {t("regulatoryDocuments", { count: regulatorySources.length })}
              </p>
            </div>
            <div className="space-y-1">
              {regulatorySources.map((source) => {
                const selected = (regulatorySourceIds ?? []).includes(source.id);
                return (
                  <div
                    key={source.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors select-none",
                      selected ? "bg-primary/10" : "hover:bg-muted",
                    )}
                    onClick={() => toggleRegulatory(source.id)}
                    role="checkbox"
                    aria-checked={selected}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === " " && toggleRegulatory(source.id)}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        selected
                          ? "bg-primary border-primary"
                          : "border-border bg-background",
                      )}
                    >
                      {selected && (
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        {source.externalUrl && (
                          <a
                            href={source.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:text-primary/80 shrink-0"
                            aria-label={t("openInNewWindow", { name: source.name })}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("excerpts", { count: source.chunkCount })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* User sources */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("loadingSources")}
          </div>
        ) : indexedSources.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {sources.length > 0 ? (
              <span>
                {sources.some((s) => s.status === "indexed")
                  ? t("noneMatch")
                  : sources.some((s) => s.status !== "failed")
                    ? t("stillProcessing")
                    : t("allFailed")}{" "}
                <Link
                  href={Routes.SOURCES}
                  className="text-primary underline underline-offset-2"
                >
                  {t("manageSources")}
                </Link>
              </span>
            ) : (
              <span>
                {t("noIndexedSourcesPrefix")}{" "}
                <Link
                  href={Routes.SOURCES}
                  className="text-primary underline underline-offset-2"
                >
                  {t("uploadDocuments")}
                </Link>{" "}
                {t("noIndexedSourcesSuffix")}
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {t("mySources", { count: indexedSources.length })}
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {indexedSources.map((source) => {
                const selected = sourceIds.includes(source.id);
                return (
                  <div
                    key={source.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors select-none",
                      selected ? "bg-primary/10" : "hover:bg-muted",
                    )}
                    onClick={() => toggleSource(source.id)}
                    role="checkbox"
                    aria-checked={selected}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === " " && toggleSource(source.id)}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        selected
                          ? "bg-primary border-primary"
                          : "border-border bg-background",
                      )}
                    >
                      {selected && (
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{source.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("excerpts", { count: source.chunkCount })}
                        {source.subject && ` · ${source.subject}`}
                        {source.schoolYear && ` · ${source.schoolYear}${t("schoolYearSuffix")}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 uppercase">
                      {source.fileKind}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </OptionRow>
  );
}
