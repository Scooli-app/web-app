"use client";

import { SlideThumbnail } from "@/components/document-editor-v2/SlideThumbnail";
import { presentationToCanvas } from "@/components/document-editor-v2/canvas-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiRequestError } from "@/services/api/client";
import {
  applySuggestion,
  getSuggestionDiff,
  refreshSuggestion,
  rejectSuggestion,
} from "@/services/api/document-versions.service";
import type { CanvasSlide } from "@/shared/types/canvas-presentation";
import type { Document } from "@/shared/types/document";
import type { DocumentVersionDiff, PendingSuggestion, SectionChange } from "@/shared/types/document-suggestions";
import { SCHEMA_VERSION, slideBlockSchema } from "@/shared/types/blocks";
import { THEMES, translateThemeName } from "@/shared/types/presentation-theme";
import { cn } from "@/shared/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  applyPayload,
  diffSegments,
  initialSelection,
  isLongText,
  META_KEY,
  reviewableChanges,
  selectedCount,
  toggleAll,
  toggleSection,
  toReadableText,
  unchangedCount,
} from "./suggestion-review";

export type SuggestionContentFormat = "markdown" | "json";
type DiffView = "before" | "after" | "changes";

const DIFF_VIEWS: DiffView[] = ["before", "after", "changes"];

const BADGE_VARIANT = {
  added: "default",
  changed: "secondary",
  removed: "outline",
} as const;

export function formatSuggestionDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long" });
}

/** The backend's `409 format_changed` from apply: the presentation's format moved on since the suggestion. */
function isFormatChangedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 409 && error.code === "format_changed";
}

/**
 * A presentation section is a slide serialised as JSON. Two formats exist: a v2 canvas slide (has `elements`)
 * and a v1 block (`type: "slide"`, not yet opened in the editor), which is converted with the editor's own
 * converter. Anything unreadable yields null.
 */
function parseSlide(raw: string | null): CanvasSlide | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if ("elements" in parsed) return parsed as CanvasSlide;
  const block = slideBlockSchema.safeParse(parsed);
  if (!block.success) return null;
  // A one-block document: the converter maps every block, so the only slide is the one we want.
  return presentationToCanvas({ schemaVersion: SCHEMA_VERSION, documentType: "presentation", blocks: [block.data] })
    .slides[0] ?? null;
}

interface PresentationSettings {
  themeId?: string;
}

/** The `_meta` section holds deck-level fields rather than a slide. */
function parseSettings(raw: string | null): PresentationSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PresentationSettings | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function themeName(themeId: string | undefined): string | null {
  if (!themeId) return null;
  return THEMES.some((theme) => theme.id === themeId) ? translateThemeName(themeId) : themeId;
}

function MarkdownBody({ change, view }: { change: SectionChange; view: DiffView }) {
  const t = useTranslations("documentVersions.review");
  const [expanded, setExpanded] = useState(false);

  const segments = view === "changes" ? diffSegments(change.before, change.after) : null;
  const plain = toReadableText(view === "before" ? change.before : change.after);
  const fullText = segments ? segments.map((segment) => segment.value).join("") : plain;
  const long = isLongText(fullText);

  return (
    <div>
      <div
        className={cn(
          "whitespace-pre-wrap font-serif text-[15px] leading-7 text-foreground",
          long && !expanded && "line-clamp-[12]",
        )}
      >
        {segments
          ? segments.map((segment, index) => {
              if (segment.added) {
                return (
                  <ins
                    key={index}
                    className="rounded-sm bg-emerald-500/15 text-foreground no-underline underline decoration-emerald-700 decoration-1 underline-offset-2 dark:bg-emerald-400/20 dark:decoration-emerald-300"
                  >
                    <span className="sr-only">{t("addedText")}</span>
                    {segment.value}
                  </ins>
                );
              }
              if (segment.removed) {
                return (
                  <del
                    key={index}
                    className="rounded-sm text-muted-foreground line-through decoration-red-700/70 decoration-1 dark:decoration-red-300/70"
                  >
                    <span className="sr-only">{t("removedText")}</span>
                    {segment.value}
                  </del>
                );
              }
              return <span key={index}>{segment.value}</span>;
            })
          : plain}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? t("showLess") : t("seeAll")}
        </button>
      )}
    </div>
  );
}

function SlideBody({ change }: { change: SectionChange }) {
  const t = useTranslations("documentVersions.review");
  const sides = [
    { label: t("before"), raw: change.before },
    { label: t("after"), raw: change.after },
  ].filter((side) => side.raw !== null);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {sides.map(({ label, raw }) => {
        const slide = parseSlide(raw);
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {slide ? (
              <SlideThumbnail slide={slide} index={0} w={320} h={180} showIndex={false} />
            ) : (
              <div className="flex h-[180px] w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                {t("noSlide")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Deck-level settings are a text line, not a slide: the theme name before and after when it changed. */
function SettingsBody({ change }: { change: SectionChange }) {
  const t = useTranslations("documentVersions.review");
  const before = parseSettings(change.before);
  const after = parseSettings(change.after);
  if (!before?.themeId && !after?.themeId) return null;
  if (before?.themeId === after?.themeId) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {t("themeChange", { before: themeName(before?.themeId) ?? "—", after: themeName(after?.themeId) ?? "—" })}
    </p>
  );
}

function ChangeRow({
  change,
  checked,
  contentFormat,
  onToggle,
}: {
  change: SectionChange;
  checked: boolean;
  contentFormat: SuggestionContentFormat;
  onToggle: () => void;
}) {
  const t = useTranslations("documentVersions.review");
  const [view, setView] = useState<DiffView>("changes");
  const isPresentation = contentFormat === "json";
  const isSettings = change.key === META_KEY;
  const title = isSettings ? t("presentationSettings") : change.title;
  // Added sections only have an "after" and removed ones only a "before", so the toggle is for changed sections.
  const markdownView: DiffView = change.type === "added" ? "after" : change.type === "removed" ? "before" : view;

  return (
    <li className="border-b border-border py-5 last:border-b-0">
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={title} className="mt-1" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <Badge variant={BADGE_VARIANT[change.type as keyof typeof BADGE_VARIANT] ?? "outline"}>
              {t(`type.${change.type}`)}
            </Badge>
            {!isPresentation && change.type === "changed" && (
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(value) => {
                  if (value) setView(value as DiffView);
                }}
                aria-label={t("viewLabel")}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                {DIFF_VIEWS.map((option) => (
                  <ToggleGroupItem key={option} value={option} className="h-7 px-2.5 text-xs">
                    {t(`view.${option}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </div>
          <div className="mt-3">
            {isSettings ? (
              <SettingsBody change={change} />
            ) : isPresentation ? (
              <SlideBody change={change} />
            ) : (
              <MarkdownBody change={change} view={markdownView} />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

interface SuggestionReviewBodyProps {
  diff: DocumentVersionDiff;
  selection: Set<string>;
  contentFormat: SuggestionContentFormat;
  onToggle: (key: string) => void;
  /** Offers "Atualizar sugestão" next to the stale notice. */
  onRefresh?: () => void;
}

/** The scrollable part of the review: the stale notice, the changed sections and the unchanged count. */
export function SuggestionReviewBody({ diff, selection, contentFormat, onToggle, onRefresh }: SuggestionReviewBodyProps) {
  const t = useTranslations("documentVersions.review");
  const changes = reviewableChanges(diff.changes);
  const unchanged = unchangedCount(diff.changes);

  return (
    <div className="flex flex-col gap-4">
      {diff.stale && (
        <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/50 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">{t("staleNotice")}</p>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              {t("refresh")}
            </Button>
          )}
        </div>
      )}
      {changes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("noChanges")}</p>
      ) : (
        <ul className="flex flex-col">
          {changes.map((change) => (
            <ChangeRow
              key={change.key}
              change={change}
              checked={selection.has(change.key)}
              contentFormat={contentFormat}
              onToggle={() => onToggle(change.key)}
            />
          ))}
        </ul>
      )}
      {unchanged > 0 && <p className="text-sm text-muted-foreground">{t("unchangedCount", { count: unchanged })}</p>}
    </div>
  );
}

export interface SuggestionReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  suggestion: PendingSuggestion;
  contentFormat: SuggestionContentFormat;
  /** Called after the suggestion is applied, with the updated document. */
  onApplied: (document: Document) => void;
  /** Called after the suggestion is rejected. */
  onRejected: () => void;
  /** Called after "Atualizar sugestão" was accepted (202): the caller closes the sheet and shows it generating. */
  onRefreshed: () => void;
}

export function SuggestionReviewSheet({
  open,
  onOpenChange,
  documentId,
  suggestion,
  contentFormat,
  onApplied,
  onRejected,
  onRefreshed,
}: SuggestionReviewSheetProps) {
  const t = useTranslations("documentVersions.review");
  const locale = useLocale();
  const [diff, setDiff] = useState<DocumentVersionDiff | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Set when apply answers 409 format_changed, for a diff that did not report it when it loaded.
  const [applyFormatChanged, setApplyFormatChanged] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setApplyFormatChanged(false);
    getSuggestionDiff(documentId, suggestion.versionId)
      .then((loaded) => {
        if (cancelled) return;
        setDiff(loaded);
        setSelection(initialSelection(loaded.changes));
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, documentId, suggestion.versionId, attempt]);

  const changes = diff ? diff.changes : [];
  const reviewable = reviewableChanges(changes);
  const selected = selectedCount(changes, selection);
  const allSelected = reviewable.length > 0 && selected === reviewable.length;
  const formatChanged = diff?.formatChanged === true || applyFormatChanged;

  const handleApply = async () => {
    setBusy(true);
    try {
      const result = await applySuggestion(documentId, suggestion.versionId, applyPayload(changes, selection));
      toast.success(t("applied"));
      if (result.skipped.length > 0) {
        toast.info(t("skipped", { count: result.skipped.length }));
      }
      onApplied(result.document);
    } catch (error) {
      if (isFormatChangedError(error)) {
        setApplyFormatChanged(true);
      } else {
        toast.error(t("applyError"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    try {
      await refreshSuggestion(documentId, suggestion.versionId);
      onRefreshed();
    } catch {
      toast.error(t("refreshError"));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setConfirmReject(false);
    setBusy(true);
    try {
      await rejectSuggestion(documentId, suggestion.versionId);
      toast.success(t("rejected"));
      onRejected();
    } catch {
      toast.error(t("rejectError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[min(960px,90vw)]">
          <SheetHeader className="border-b border-border px-5 py-4 text-left sm:px-6">
            <SheetTitle className="text-lg">{t("title")}</SheetTitle>
            <SheetDescription className="text-sm text-foreground">{suggestion.reason?.summary}</SheetDescription>
            <p className="text-xs text-muted-foreground">
              {t("suggestedOn", { date: formatSuggestionDate(suggestion.createdAt, locale) })}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {formatChanged && (
              <Alert variant="primary" className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <AlertDescription className="min-w-0 flex-1 text-foreground">{t("formatChanged")}</AlertDescription>
                <Button size="sm" disabled={busy} onClick={() => void handleRefresh()}>
                  {t("refresh")}
                </Button>
              </Alert>
            )}
            {loadError ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">{t("loadError")}</p>
                <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
                  {t("retry")}
                </Button>
              </div>
            ) : !diff ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <SuggestionReviewBody
                diff={diff}
                selection={selection}
                contentFormat={contentFormat}
                onToggle={(key) => setSelection((current) => toggleSection(current, key))}
                onRefresh={() => void handleRefresh()}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-5 py-3 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              disabled={!diff || reviewable.length === 0 || busy}
              onClick={() => setSelection((current) => toggleAll(changes, current))}
            >
              {allSelected ? t("selectNone") : t("selectAll")}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setConfirmReject(true)}>
                {t("reject")}
              </Button>
              <Button disabled={!diff || formatChanged || selected === 0 || busy} onClick={() => void handleApply()}>
                {t("apply", { count: selected })}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationDialog
        isOpen={confirmReject}
        onClose={() => setConfirmReject(false)}
        onConfirm={() => void handleReject()}
        variant="danger"
        title={t("rejectTitle")}
        description={t("rejectDescription")}
        confirmLabel={t("rejectConfirm")}
        cancelLabel={t("keepSuggestion")}
      />
    </>
  );
}
