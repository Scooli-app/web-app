import { formatSubject } from "@/components/school/direction/format";
import { ApiRequestError } from "@/services/api/client";
import type { SchoolSourceQuota, SourceStatus } from "@/shared/types/sources";

/** A translator scoped to the `schoolSources` namespace. */
export type SchoolSourcesT = (key: string, values?: Record<string, string | number>) => string;

const MB = 2 ** 20;
const GB = 2 ** 30;

// shortcut: whole KB/MB, and GB only when exact (no decimal separator to localise); upgrade if a school needs "1,5 GB".
export function formatSize(bytes: number, t: SchoolSourcesT): string {
  const kb = Math.max(1, Math.round(bytes / 1024));
  if (bytes > 0 && kb < 1024) return t("size.kb", { n: kb }); // never "1024 KB": that rounds to 1 MB
  return bytes >= GB && bytes % GB === 0
    ? t("size.gb", { n: bytes / GB })
    : t("size.mb", { n: Math.round(bytes / MB) });
}

export function formatQuota(q: SchoolSourceQuota, t: SchoolSourcesT): string {
  return t("quota", {
    files: q.filesUsed,
    filesMax: q.filesMax,
    used: formatSize(q.bytesUsed, t),
    max: formatSize(q.bytesMax, t),
  });
}

/** "Matemática · 7.º–9.º": subjects, then school years with runs of consecutive years as ranges. Nothing tagged = all. */
export function formatTags(subjects: string[], schoolYears: number[], t: SchoolSourcesT): string {
  const parts: string[] = [];
  if (subjects.length) parts.push(subjects.map((s) => formatSubject(s, s)).join(", "));
  const years = [...new Set(schoolYears)].sort((a, b) => a - b);
  if (years.length) {
    const groups: number[][] = [];
    for (const y of years) {
      const last = groups[groups.length - 1];
      if (last && y === last[last.length - 1] + 1) last.push(y);
      else groups.push([y]);
    }
    const list = groups
      .map((g) => (g.length > 1 ? t("years.range", { from: g[0], to: g[g.length - 1] }) : t("years.single", { n: g[0] })))
      .join(", ");
    parts.push(t("years.list", { list }));
  }
  return parts.length ? parts.join(" · ") : t("all");
}

/** A refusal in the admin's language: known codes get our own copy, then the server's message, then the generic one. */
export function schoolSourceError(e: unknown, t: SchoolSourcesT): string {
  if (!(e instanceof ApiRequestError)) return t("errors.generic");
  if (e.code === "duplicate_source") return t("errors.duplicate");
  if (e.code === "source_indexing") return t("errors.indexing");
  return e.message || t("errors.generic");
}

export const isSettled = (status: SourceStatus) => status === "indexed" || status === "failed";
