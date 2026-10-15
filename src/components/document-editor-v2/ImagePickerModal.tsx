"use client";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

/**
 * ImagePickerModal - modal for adding an image to a slide.
 *
 * Four tabs:
 *   1. Gerar com IA     - prompt -> AI-generated image (Bloom)
 *   2. Pesquisar imagens - free stock images (Wikimedia Commons, Openverse, and
 *                          Pixabay/Pexels when configured), copied into our storage
 *   3. Carregar         - upload from PC (drag-drop or click)
 *   4. Por URL          - paste any image URL
 *
 * On confirm the parent receives { url, prompt, backendId?, attribution? } and
 * is responsible for inserting the canvas element.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importStockImage, searchStockImages, uploadDocumentImage } from "@/services/api";
import { ApiRequestError } from "@/services/api/client";
import type { ImageAttribution } from "@/shared/types/blocks";
import type { StockImage, StockImageFilter } from "@/shared/types/document";
import { providerDisplayName } from "@/shared/utils/photo-credit";
import { cn } from "@/shared/utils/utils";
import { ExternalLink, Image as ImageIcon, Link2, Loader2, RotateCcw, Search, Sparkles, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* --------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

type Tab = "generate" | "images" | "upload" | "url";

export interface ImageInsertResult {
  url: string;
  prompt: string;
  backendId?: string;
  /** Stock images only: the author/licence credit to keep with the element. */
  attribution?: ImageAttribution;
}

interface Props {
  open: boolean;
  documentId: string;
  onClose: () => void;
  onInsert: (result: ImageInsertResult) => void;
  onGenerate: (prompt: string) => void;
}

/* --------------------------------------------------------------------------
 * Tab button helper
 * -------------------------------------------------------------------------- */
function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* --------------------------------------------------------------------------
 * Generate tab
 * -------------------------------------------------------------------------- */
function GenerateTab({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}) {
  const t = useTranslations("editor.imagePickerModal");
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    const p = prompt.trim();
    if (!p) return;
    onClose();
    onGenerate(p);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {t("describeImageLabel")}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("generatePlaceholder")}
          rows={4}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
          }}
          className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          {t("generateHint")}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1.5">
      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim()}
        className="gap-2 self-end"
      >
        <Sparkles className="h-4 w-4" />
        {t("generateButton")}
      </Button>
        <AiDisclaimer className="text-right" />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Images tab (stock libraries: Wikimedia Commons, Openverse, Pixabay, Pexels)
 * -------------------------------------------------------------------------- */
const PROVIDER_HOME: Record<string, string> = {
  wikimedia: "https://commons.wikimedia.org",
  openverse: "https://openverse.org",
  pixabay: "https://pixabay.com",
  pexels: "https://www.pexels.com",
};

/** Short provider names for the result badges (the full name is in the footer and the credit). */
const PROVIDER_SHORT: Record<string, string> = {
  wikimedia: "Wikimedia",
  openverse: "Openverse",
  pixabay: "Pixabay",
  pexels: "Pexels",
};

type FilterChip = "all" | StockImageFilter;

const FILTER_CHIPS: { value: FilterChip; labelKey: string }[] = [
  { value: "all", labelKey: "imagesFilterAll" },
  { value: "photo", labelKey: "imagesFilterPhotos" },
  { value: "illustration", labelKey: "imagesFilterIllustrations" },
  { value: "diagram", labelKey: "imagesFilterDiagrams" },
];

const TYPE_LABEL_KEYS: Record<StockImage["type"], string> = {
  photo: "imagesTypePhoto",
  illustration: "imagesTypeIllustration",
  diagram: "imagesTypeDiagram",
  map: "imagesTypeMap",
};

/** Backend stock image error codes → message keys (see StockImageException on the backend). */
const STOCK_ERROR_KEYS: Record<string, string> = {
  stock_rate_limited: "imagesErrorRateLimited",
  stock_unavailable: "imagesErrorUnavailable",
  stock_not_configured: "imagesErrorNotConfigured",
  stock_disabled: "imagesErrorDisabled",
  stock_image_gone: "imagesErrorGone",
  stock_invalid_image: "imagesErrorInvalid",
  stock_storage_failed: "imagesErrorStorage",
};

/** Errors retrying cannot fix: the tab shows the message without a retry button. */
const PERMANENT_ERROR_KEYS = new Set(["imagesErrorNotConfigured", "imagesErrorDisabled", "imagesErrorDocument"]);

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Picks the message key for a failed search or insert from the API error's status and code. */
function stockErrorKey(err: unknown, phase: "search" | "insert"): string {
  if (isOffline()) return "imagesErrorOffline";
  if (err instanceof ApiRequestError) {
    if (err.status === 0) return "imagesErrorOffline";
    if (err.code && STOCK_ERROR_KEYS[err.code]) return STOCK_ERROR_KEYS[err.code];
    if (err.status === 404) return "imagesErrorDocument";
    if (err.status === 429) return "imagesErrorRateLimited";
    if (err.status >= 500) return phase === "search" ? "imagesErrorUnavailable" : "imagesErrorStorage";
  }
  return phase === "search" ? "imagesError" : "imagesInsertError";
}

/** A thumbnail that failed to load (provider hiccup, removed file) becomes a labelled placeholder. */
function StockThumbnail({ image, contain }: { image: StockImage; contain: boolean }) {
  const t = useTranslations("editor.imagePickerModal");
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted px-2 text-center text-[10px] text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
        {t("imagesThumbUnavailable")}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote provider thumbnails
    <img
      src={image.thumbnailUrl}
      alt={image.alt ?? ""}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={cn(
        "h-full w-full transition-transform duration-200 group-hover:scale-105",
        // Diagrams and maps are shown whole: cropping would cut labels off.
        contain ? "object-contain p-1" : "object-cover",
      )}
    />
  );
}

function ImagesTab({
  documentId,
  onInsert,
}: {
  documentId: string;
  onInsert: (r: ImageInsertResult) => void;
}) {
  const t = useTranslations("editor.imagePickerModal");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterChip>("all");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<StockImage[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [failedProviders, setFailedProviders] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  /** Message key for a failed first page (shown in place of the grid). */
  const [errorKey, setErrorKey] = useState<string | null>(null);
  /** Message key for a failed "load more" (results so far stay visible). */
  const [moreErrorKey, setMoreErrorKey] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{ q: string; chip: FilterChip } | null>(null);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  // Ignore responses to searches that a newer query or filter has superseded.
  const requestSeq = useRef(0);
  // The modal can be closed while an import is in flight: don't insert into a closed editor.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runSearch = useCallback(
    async (q: string, chip: FilterChip, nextPage: number) => {
      const seq = ++requestSeq.current;
      setSearching(true);
      setMoreErrorKey(null);
      if (nextPage === 1) {
        setErrorKey(null);
        setResults([]);
        setLastRequest({ q, chip });
      }
      if (isOffline()) {
        if (nextPage === 1) setErrorKey("imagesErrorOffline");
        else setMoreErrorKey("imagesErrorOffline");
        setSearching(false);
        return;
      }
      try {
        const res = await searchStockImages(documentId, q, {
          type: chip === "all" ? undefined : chip,
          page: nextPage,
          locale,
        });
        if (seq !== requestSeq.current) return;
        setResults((prev) => (nextPage === 1 ? res.results : [...prev, ...res.results]));
        setProviders((prev) =>
          nextPage === 1 ? res.providers : Array.from(new Set([...prev, ...res.providers])),
        );
        setFailedProviders(res.failedProviders ?? []);
        setPage(res.page);
        setHasMore(res.hasMore);
        setSubmittedQuery(q);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        const key = stockErrorKey(err, "search");
        if (nextPage === 1) {
          setErrorKey(key);
          setSubmittedQuery(q);
        } else {
          setMoreErrorKey(key === "imagesError" ? "imagesLoadMoreError" : key);
        }
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    },
    [documentId, locale],
  );

  const retry = () => {
    if (lastRequest) void runSearch(lastRequest.q, lastRequest.chip, 1);
  };

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    void runSearch(q, filter, 1);
  };

  const handleFilter = (chip: FilterChip) => {
    if (chip === filter) return;
    setFilter(chip);
    // The filter applies to what is in the box now, even if it was not submitted yet.
    const q = query.trim() || submittedQuery;
    if (q) void runSearch(q, chip, 1);
  };

  const handlePick = async (image: StockImage) => {
    if (insertingId) return;
    setInsertingId(image.id);
    if (isOffline()) {
      toast.error(t("imagesErrorOffline"));
      setInsertingId(null);
      return;
    }
    try {
      const res = await importStockImage(documentId, image.id);
      if (!res.image?.url) throw new Error("missing url");
      if (!mounted.current) return;
      const credit = res.attribution ?? image;
      onInsert({
        url: res.image.url,
        prompt: res.image.alt ?? image.alt ?? "",
        backendId: res.image.id,
        attribution: {
          provider: credit.provider,
          author: credit.author ?? null,
          authorUrl: credit.authorUrl ?? null,
          sourceUrl: credit.sourceUrl ?? null,
          license: credit.license ?? null,
          licenseUrl: credit.licenseUrl ?? null,
        },
      });
    } catch (err) {
      if (!mounted.current) return;
      const key = stockErrorKey(err, "insert");
      toast.error(t(key));
      // A removed image would fail again: take it out of the grid.
      if (key === "imagesErrorGone" || key === "imagesErrorInvalid") {
        setResults((prev) => prev.filter((r) => r.id !== image.id));
      }
      setInsertingId(null);
    }
  };

  const licenseLabel = (image: StockImage) => {
    if (image.licenseCode === "pd") return t("imagesLicensePublicDomain");
    if (image.licenseCode === image.provider) {
      return t("imagesLicenseProvider", { provider: PROVIDER_SHORT[image.provider] ?? image.providerName });
    }
    return image.license;
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            autoFocus
            maxLength={200}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("imagesSearchPlaceholder")}
            aria-label={t("tabImages")}
            className="w-full rounded-lg border border-border bg-muted/30 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button type="submit" disabled={!query.trim() || searching} className="gap-2">
          {searching && results.length === 0 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {t("imagesSearchButton")}
        </Button>
      </form>

      <div
        role="group"
        aria-label={t("imagesFilterLabel")}
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]"
      >
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => handleFilter(chip.value)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {t(chip.labelKey)}
            </button>
          );
        })}
      </div>

      {results.length === 0 ? (
        <div
          role={errorKey ? "alert" : "status"}
          aria-live="polite"
          className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground"
        >
          {searching ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : errorKey ? (
            <>
              <p>{t(errorKey)}</p>
              {!PERMANENT_ERROR_KEYS.has(errorKey) && lastRequest && (
                <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("imagesRetry")}
                </Button>
              )}
            </>
          ) : submittedQuery ? (
            t("imagesNoResults", { query: submittedQuery })
          ) : (
            t("imagesEmptyHint")
          )}
        </div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto pr-1">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((image) => {
              const inserting = insertingId === image.id;
              const isPhoto = image.type === "photo";
              const provider = PROVIDER_SHORT[image.provider] ?? image.providerName;
              const description = [
                image.alt,
                image.author ? t("imagesBy", { name: image.author }) : null,
                `${image.providerName} · ${licenseLabel(image)}`,
              ]
                .filter(Boolean)
                .join(" — ");
              return (
                <li
                  key={image.id}
                  className={cn(
                    "group relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60",
                    isPhoto ? "bg-muted" : "bg-white",
                  )}
                  style={isPhoto && image.avgColor ? { backgroundColor: image.avgColor } : undefined}
                >
                  <button
                    type="button"
                    disabled={insertingId !== null}
                    onClick={() => void handlePick(image)}
                    title={description}
                    aria-label={description || t("insertImage")}
                    className="block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-wait"
                  >
                    <StockThumbnail image={image} contain={!isPhoto} />
                  </button>

                  {!isPhoto && (
                    <span className="pointer-events-none absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
                      {t(TYPE_LABEL_KEYS[image.type])}
                    </span>
                  )}

                  {image.sourceUrl && !inserting && (
                    <a
                      href={image.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("imagesOpenSource", { provider: image.providerName })}
                      title={t("imagesOpenSource", { provider: image.providerName })}
                      className="absolute right-1 top-1 rounded bg-background/90 p-1 text-foreground opacity-0 shadow-sm transition-opacity hover:bg-background focus:opacity-100 group-hover:opacity-100"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {/* Provider and licence stay visible: CC licences require it, Pixabay and Pexels ask for it. */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 via-black/45 to-transparent px-1.5 pb-1 pt-4 text-[10px] leading-tight text-white">
                    <span className="font-semibold">{provider}</span>
                    {" · "}
                    {licenseLabel(image)}
                  </div>

                  {inserting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-xs text-white">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("imagesInserting")}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="mt-3 flex flex-col items-center gap-1.5">
              {moreErrorKey && (
                <p role="alert" className="text-center text-xs text-destructive">
                  {t(moreErrorKey)}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={searching}
                onClick={() => void runSearch(submittedQuery, filter, page + 1)}
                className="gap-2"
              >
                {searching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  moreErrorKey && <RotateCcw className="h-3.5 w-3.5" />
                )}
                {moreErrorKey ? t("imagesRetry") : t("imagesLoadMore")}
              </Button>
            </div>
          )}
        </div>
      )}

      {(providers.length > 0 || failedProviders.length > 0) && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <p>
            {failedProviders.length > 0
              ? t("imagesPartial", { providers: failedProviders.map(providerDisplayName).join(", ") })
              : t("imagesCreditNote")}
          </p>
          {providers.length > 0 && (
            <p className="shrink-0">
              {t.rich("imagesPoweredBy", {
                links: () =>
                  providers.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ", "}
                      <a
                        href={PROVIDER_HOME[id] ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {providerDisplayName(id)}
                      </a>
                    </span>
                  )),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Upload tab
 * -------------------------------------------------------------------------- */
/** Formats the backend can decode (DocumentImageService.validateImage) and its 10 MB cap. */
const UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
function UploadTab({
  documentId,
  onInsert,
}: {
  documentId: string;
  onInsert: (r: ImageInsertResult) => void;
}) {
  const t = useTranslations("editor.imagePickerModal");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Same limits as the backend, checked first so the teacher gets a precise reason.
      if (!UPLOAD_TYPES.has(file.type)) {
        toast.error(t("uploadErrorType"));
        return;
      }
      if (file.size === 0) {
        toast.error(t("uploadErrorEmpty"));
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        const size = (file.size / (1024 * 1024)).toLocaleString(locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
        toast.error(t("uploadErrorSize", { size }));
        return;
      }
      if (isOffline()) {
        toast.error(t("uploadErrorOffline"));
        return;
      }
      setSelectedFile(file);
      setLoading(true);
      try {
        const result = await uploadDocumentImage(documentId, file, file.name);
        if (!result.image?.url) throw new Error("missing url");
        onInsert({ url: result.image.url, prompt: file.name, backendId: result.image.id });
      } catch (err) {
        toast.error(
          t(err instanceof ApiRequestError && err.status === 0 ? "uploadErrorOffline" : "uploadError"),
        );
        setLoading(false);
        setSelectedFile(null);
      }
    },
    [documentId, locale, onInsert, t],
  );

  return (
    <div className="p-4">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={Array.from(UPLOAD_TYPES).join(",")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          // Reset so picking the same file again (after an error) fires onChange.
          e.target.value = "";
          if (f) void handleFile(f);
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "flex h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
          dragging
            ? "border-primary bg-primary/5 text-primary"
            : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:bg-muted/40",
          loading && "pointer-events-none opacity-60",
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">{t("uploadingFile", { name: selectedFile?.name ?? "" })}</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {t("uploadHint")}
              </p>
              <p className="mt-0.5 text-xs">{t("uploadFormats")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * URL tab
 * -------------------------------------------------------------------------- */
const URL_CHECK_TIMEOUT_MS = 10_000;
function UrlTab({ onInsert }: { onInsert: (r: ImageInsertResult) => void }) {
  const t = useTranslations("editor.imagePickerModal");
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInsert = async () => {
    const u = url.trim();
    if (!u || checking) return;
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      setError(t("urlInvalid"));
      return;
    }
    // http images are blocked as mixed content on the https app; anything else isn't an image URL.
    if (parsed.protocol !== "https:") {
      setError(t("urlInvalid"));
      return;
    }
    setError(null);
    setChecking(true);
    // Load it once first, so a broken link fails here instead of as an empty box on the slide.
    // Same CORS mode as the canvas (SlideKonvaEditor): a host that doesn't allow it can't be drawn.
    const loads = await new Promise<boolean>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      const timer = window.setTimeout(() => resolve(false), URL_CHECK_TIMEOUT_MS);
      img.onload = () => {
        window.clearTimeout(timer);
        resolve(img.naturalWidth > 0);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve(false);
      };
      img.referrerPolicy = "no-referrer";
      img.src = parsed.href;
    });
    setChecking(false);
    if (!loads) {
      setError(t(isOffline() ? "imagesErrorOffline" : "urlLoadError"));
      return;
    }
    onInsert({ url: parsed.href, prompt: "" });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {t("urlLabel")}
        </label>
        <input
          type="url"
          value={url}
          autoFocus
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") void handleInsert(); }}
          placeholder={t("urlPlaceholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "image-url-error" : undefined}
          className={cn(
            "w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary",
            error ? "border-destructive" : "border-border",
          )}
        />
        {error && (
          <p id="image-url-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <Button
        onClick={() => void handleInsert()}
        disabled={!url.trim() || checking}
        className="gap-2 self-end"
      >
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        {checking ? t("urlChecking") : t("insertImage")}
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Main modal
 * -------------------------------------------------------------------------- */
export function ImagePickerModal({ open, documentId, onClose, onInsert, onGenerate }: Props) {
  const t = useTranslations("editor.imagePickerModal");
  const [tab, setTab] = useState<Tab>("generate");

  const handleInsert = (result: ImageInsertResult) => {
    onInsert(result);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 pb-0 pt-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-primary" />
            {t("dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="mx-4 mt-3 flex gap-1 overflow-x-auto rounded-lg bg-muted/60 p-0.5 [scrollbar-width:none]">
          <TabBtn
            active={tab === "generate"}
            onClick={() => setTab("generate")}
            icon={Sparkles}
            label={t("tabGenerate")}
          />
          <TabBtn
            active={tab === "images"}
            onClick={() => setTab("images")}
            icon={Search}
            label={t("tabImages")}
          />
          <TabBtn
            active={tab === "upload"}
            onClick={() => setTab("upload")}
            icon={Upload}
            label={t("tabUpload")}
          />
          <TabBtn
            active={tab === "url"}
            onClick={() => setTab("url")}
            icon={Link2}
            label={t("tabUrl")}
          />
        </div>

        <div className="min-h-[220px]">
          {tab === "generate" && (
            <GenerateTab onClose={onClose} onGenerate={onGenerate} />
          )}
          {tab === "images" && (
            <ImagesTab documentId={documentId} onInsert={handleInsert} />
          )}
          {tab === "upload" && (
            <UploadTab documentId={documentId} onInsert={handleInsert} />
          )}
          {tab === "url" && (
            <UrlTab onInsert={handleInsert} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
