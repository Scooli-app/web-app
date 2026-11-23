"use client";

import { formatTags } from "@/components/school/sources/schoolSourceFormat";
import { Card } from "@/components/ui/card";
import { LoadError } from "@/components/ui/load-error";
import { SkeletonRows } from "@/components/ui/page-skeleton";
import { Switch } from "@/components/ui/switch";
import type { SourceDefault } from "@/shared/types/sources";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSourceDefaults,
  selectSourceDefaults,
  selectSourceDefaultsStatus,
  toggleSourceDefault,
  type ToggleRefusal,
} from "@/store/sources/sourceDefaultsSlice";
import { BookOpen, ExternalLink, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";
import { groupSourceDefaults } from "./groupSourceDefaults";

/** The toast for a refused toggle: gone (404) has its own copy, then the server's message, then the generic one. */
export function toggleErrorMessage(refusal: ToggleRefusal | undefined, t: (key: string) => string): string {
  if (refusal?.status === 404) return t("sourceGone");
  return refusal?.message || t("saveError");
}

/** The "Usar por omissão" switch of one source; its label names the source. */
export function DefaultSwitch({ entry }: { entry: SourceDefault }) {
  const t = useTranslations("sources.page");
  const dispatch = useAppDispatch();
  return (
    <Switch
      checked={entry.effectiveDefault}
      aria-label={`${t("useByDefault")}: ${entry.name}`}
      onCheckedChange={async (enabled) => {
        const result = await dispatch(toggleSourceDefault({ sourceRef: entry.sourceRef, enabled }));
        if (toggleSourceDefault.rejected.match(result)) toast.error(toggleErrorMessage(result.payload as ToggleRefusal | undefined, t));
      }}
    />
  );
}

function SwitchWithLabel({ entry }: { entry: SourceDefault }) {
  const t = useTranslations("sources.page");
  return (
    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline" aria-hidden="true">
        {t("useByDefault")}
      </span>
      <DefaultSwitch entry={entry} />
    </span>
  );
}

function SchoolRow({ entry }: { entry: SourceDefault }) {
  const t = useTranslations("sources.page");
  const tStatus = useTranslations("sources.status");
  const tSchool = useTranslations("schoolSources");
  const meta = [
    entry.type === "regra" ? t("typeRegra") : t("typeApoio"),
    formatTags(entry.subjects, entry.schoolYears, tSchool),
    entry.uploadedByName ? t("addedBy", { name: entry.uploadedByName }) : null,
    entry.status && entry.status !== "indexed" ? tStatus(entry.status) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-sm font-medium" title={entry.name}>
            {entry.name}
          </p>
          <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground" title={meta}>
            {meta}
          </p>
          {entry.summary && (
            <details className="mt-1 text-xs text-muted-foreground">
              <summary className="cursor-pointer">{t("summary")}</summary>
              <p className="mt-1 break-words">{entry.summary}</p>
            </details>
          )}
        </div>
        <SwitchWithLabel entry={entry} />
      </div>
    </Card>
  );
}

/** Curriculum, regulatory and school sources with a default switch each; "As tuas fontes" lives in the page. */
export function DefaultSourcesSections() {
  const t = useTranslations("sources.page");
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectSourceDefaults);
  const status = useAppSelector(selectSourceDefaultsStatus);
  const { curriculum, regulatory, schools } = useMemo(() => groupSourceDefaults(entries), [entries]);

  if (status === "failed") return <LoadError onRetry={() => void dispatch(fetchSourceDefaults())} />;
  if (status !== "loaded") return <SkeletonRows rows={2} />;

  return (
    <>
      {curriculum.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("curriculum")}</h2>
          {curriculum.map((e) => (
            <Card key={e.sourceRef} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words text-sm font-medium" title={e.name}>
                      {e.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("aeDescription")}</p>
                    {!e.effectiveDefault && (
                      <p role="status" className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        {t("aeOffNote")}
                      </p>
                    )}
                  </div>
                </div>
                <SwitchWithLabel entry={e} />
              </div>
            </Card>
          ))}
        </section>
      )}

      {regulatory.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("regulatory")}</h2>
          {regulatory.map((e) => (
            <Card key={e.sourceRef} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-medium" title={e.name}>
                        {e.name}
                      </p>
                      {e.externalUrl && (
                        <a
                          href={e.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-primary hover:text-primary/80"
                          aria-label={t("openOfficialText", { name: e.name })}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("regulatoryDescription")}</p>
                  </div>
                </div>
                <SwitchWithLabel entry={e} />
              </div>
            </Card>
          ))}
        </section>
      )}

      {schools.map((s) => (
        <section key={s.organizationId} className="space-y-3">
          <h2 className="break-words text-base font-semibold">{t("fromSchool", { name: s.organizationName })}</h2>
          {s.entries.map((e) => (
            <SchoolRow key={e.sourceRef} entry={e} />
          ))}
        </section>
      ))}
    </>
  );
}
