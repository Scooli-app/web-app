"use client";

import { OptionRow } from "./FormCard";
import { formatTags } from "@/components/school/sources/schoolSourceFormat";
import { orderSchoolSources } from "../sourceSelection";
import { useCountryCatalog } from "@/hooks/useCountryCatalog";
import { listRegulatorySources } from "@/services/api/sources.service";
import { FeatureFlag } from "@/shared/types/featureFlags";
import { Routes } from "@/shared/types/routes";
import type { SourceDefault, UserSource } from "@/shared/types/sources";
import { cn } from "@/shared/utils/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsContextPipelineV2Enabled } from "@/store/features/selectors";
import { selectSourceDefaults, selectSourceDefaultsStatus } from "@/store/sources/sourceDefaultsSlice";
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
  const catalog = useCountryCatalog();
  const dispatch = useAppDispatch();
  const { sources, loading } = useAppSelector((state) => state.sources);
  const isContextPipelineV2Enabled = useAppSelector(selectIsContextPipelineV2Enabled);
  const isUserSourcesEnabled = useAppSelector((state) => state.features.flags[FeatureFlag.USER_SOURCES] === true);
  const defaults = useAppSelector(selectSourceDefaults);
  const defaultsFailed = useAppSelector(selectSourceDefaultsStatus) === "failed";
  const tSchool = useTranslations("schoolSources");
  const tPage = useTranslations("sources.page");

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
  }, [isContextPipelineV2Enabled]);

  const { matching: matchingSchool, others: otherSchool } = orderSchoolSources(
    defaults,
    subject ? catalog.subjectValue(subject) : subject,
    schoolYear,
  );

  // A ticked source stays listed whatever the subject/year, so the teacher can always see and untick what is sent.
  const indexedSources = sources.filter(
    (s) =>
      s.status === "indexed" &&
      (sourceIds.includes(s.id) ||
        ((!subject || !s.subject || s.subject === subject) && (!schoolYear || !s.schoolYear || s.schoolYear === schoolYear))),
  );
  const hasSchoolSources = matchingSchool.length + otherSchool.length > 0;

  const toggleSource = (id: string) => {
    const next = sourceIds.includes(id)
      ? sourceIds.filter((s) => s !== id)
      : [...sourceIds, id];
    onUpdate("sourceIds", next);
  };

  const schoolRow = (entry: SourceDefault) => {
    const selected = sourceIds.includes(entry.sourceRef);
    return (
      <PickerRow
        key={entry.sourceRef}
        selected={selected}
        onToggle={() => toggleSource(entry.sourceRef)}
        title={entry.name}
        meta={`${entry.type === "regra" ? tPage("typeRegra") : tPage("typeApoio")} · ${formatTags(entry.subjects, entry.schoolYears, tSchool)}`}
      />
    );
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
              "inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border px-3 py-1 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              includeAe ? "border-primary bg-primary/10 text-primary" : "border-input bg-card text-foreground hover:bg-accent",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {includeAe && <Check className="h-3 w-3 shrink-0" aria-hidden />}
              {catalog.countryCode === "BR" ? t("includeBncc") : t("includeAe")}
            </span>
            <span className="whitespace-nowrap font-normal text-muted-foreground">· {t("recommended")}</span>
          </button>
          <Link
            href={Routes.SOURCES}
            className="flex shrink-0 items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("manageSources")}
          </Link>
        </div>

        {/* Nothing here is sent unless changed, so the ticks shown may not be the teacher's defaults: say so. */}
        {defaultsFailed && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("defaultsFailed")}
          </p>
        )}

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
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {regulatorySources.map((source) => (
                <PickerRow
                  key={source.id}
                  selected={(regulatorySourceIds ?? []).includes(source.id)}
                  onToggle={() => toggleRegulatory(source.id)}
                  title={source.name}
                  titleExtra={
                    source.externalUrl && (
                      <a
                        href={source.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="shrink-0 text-primary hover:text-primary/80"
                        aria-label={t("openInNewWindow", { name: source.name })}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )
                  }
                  meta={t("excerpts", { count: source.chunkCount })}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* School sources: the ones that fit this subject and year first, the rest under a fold. */}
        {hasSchoolSources && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("schoolSources")}</p>
            {matchingSchool.length > 0 && (
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">{matchingSchool.map(schoolRow)}</div>
            )}
            {otherSchool.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {t("otherSchoolSources")} ({otherSchool.length})
                </summary>
                <div className="mt-1 max-h-64 space-y-1 overflow-y-auto pr-1">{otherSchool.map(schoolRow)}</div>
              </details>
            )}
          </div>
        )}

        {/* User sources; with none at all but school sources above, no note (it would read as if those were unindexed). */}
        {!isUserSourcesEnabled || (!loading && sources.length === 0 && hasSchoolSources) ? null : loading ? (
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
              {indexedSources.map((source) => (
                <PickerRow
                  key={source.id}
                  selected={sourceIds.includes(source.id)}
                  onToggle={() => toggleSource(source.id)}
                  title={source.name}
                  meta={[
                    t("excerpts", { count: source.chunkCount }),
                    source.subject,
                    source.schoolYear ? `${source.schoolYear}${t("schoolYearSuffix")}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={<span className="shrink-0 text-xs uppercase text-muted-foreground">{source.fileKind}</span>}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </OptionRow>
  );
}

/** One selectable source row: the whole row toggles (Space/Enter too); a long title or meta clamps, full text in the title. */
function PickerRow({
  selected,
  onToggle,
  title,
  titleExtra,
  meta,
  trailing,
}: {
  selected: boolean;
  onToggle: () => void;
  title: string;
  titleExtra?: React.ReactNode;
  meta: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        selected ? "bg-primary/10" : "hover:bg-muted",
      )}
      onClick={onToggle}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div
        className={cn(
          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
          selected ? "bg-primary border-primary" : "border-border bg-background",
        )}
      >
        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-medium" title={title}>
            {title}
          </p>
          {titleExtra}
        </div>
        <p className="line-clamp-2 break-words text-xs text-muted-foreground" title={meta}>
          {meta}
        </p>
      </div>
      {trailing}
    </div>
  );
}
