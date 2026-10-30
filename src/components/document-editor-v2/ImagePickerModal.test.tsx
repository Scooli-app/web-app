// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StockImage, StockImageSearchResponse } from "@/shared/types/document";
import { ImagePickerModal } from "./ImagePickerModal";

const searchStockImages = vi.fn();
const importStockImage = vi.fn();
const uploadDocumentImage = vi.fn();

vi.mock("@/services/api", () => ({
  searchStockImages: (...args: unknown[]) => searchStockImages(...args),
  importStockImage: (...args: unknown[]) => importStockImage(...args),
  uploadDocumentImage: (...args: unknown[]) => uploadDocumentImage(...args),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("next-intl", () => {
  const translate = (key: string) => key;
  const t = Object.assign(translate, { rich: (key: string) => key });
  return {
    useTranslations: () => t,
    useLocale: () => "pt-PT",
  };
});

const DEFAULT_QUERY = "imagesDefaultQuery";

function image(id: string, overrides: Partial<StockImage> = {}): StockImage {
  return {
    id: `wikimedia:${id}`,
    provider: "wikimedia",
    providerName: "Wikimedia Commons",
    type: "illustration",
    thumbnailUrl: `https://upload.example/${id}.jpg`,
    width: 800,
    height: 600,
    alt: `Image ${id}`,
    author: "Ana",
    authorUrl: null,
    sourceUrl: `https://commons.example/${id}`,
    license: "CC BY-SA 4.0",
    licenseCode: "cc-by-sa-4.0",
    licenseUrl: null,
    attributionRequired: true,
    avgColor: null,
    ...overrides,
  };
}

function page(results: StockImage[], overrides: Partial<StockImageSearchResponse> = {}): StockImageSearchResponse {
  return {
    results,
    page: 1,
    hasMore: true,
    providers: ["wikimedia"],
    failedProviders: [],
    ...overrides,
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Minimal IntersectionObserver double that records the observed root and lets tests fire it. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly root: Element | null;
  readonly targets = new Set<Element>();
  disconnected = false;
  constructor(
    readonly callback: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void,
    options?: { root?: Element | null },
  ) {
    this.root = options?.root ?? null;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.disconnected = true;
    this.targets.clear();
  }
  takeRecords() {
    return [];
  }
  fire(isIntersecting = true) {
    const entries = Array.from(this.targets).map((target) => ({ isIntersecting, target }));
    this.callback(entries);
  }
}

let container: HTMLDivElement;
let root: Root;

function flush() {
  return act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

type ModalProps = Partial<{ documentId: string; initialSearchQuery: string }>;

function renderTree(p: ModalProps) {
  return (
    <ImagePickerModal
      open
      documentId={p.documentId ?? "doc-1"}
      initialSearchQuery={p.initialSearchQuery}
      onClose={vi.fn()}
      onInsert={vi.fn()}
      onGenerate={vi.fn()}
    />
  );
}

function mount(props: ModalProps = {}) {
  act(() => {
    root.render(renderTree(props));
  });
}

function renderModal(props: ModalProps = {}) {
  mount(props);
  return {
    rerender: (next: ModalProps) => act(() => root.render(renderTree(next))),
  };
}

/** Sets a controlled input's value the way a user typing does (React tracks the native setter). */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Opens the "Search images" tab; the modal opens on the Generate tab. */
async function openImagesTab() {
  const tab = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "tabImages");
  if (!tab) throw new Error("images tab button not found");
  await act(async () => {
    tab.click();
  });
  await flush();
}

function searchInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="search"]');
  if (!input) throw new Error("search input not found");
  return input;
}

function filterChip(label: string): HTMLButtonElement {
  const chip = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === label);
  if (!chip) throw new Error(`chip ${label} not found`);
  return chip;
}

function thumbnails(): HTMLImageElement[] {
  return Array.from(document.querySelectorAll<HTMLImageElement>("li img"));
}

function loadMoreButton(): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent === "imagesLoadMore" || b.textContent === "imagesRetry",
  );
}

function scrollContainer(): HTMLElement {
  const list = document.querySelector("ul");
  const scroll = list?.parentElement;
  if (!scroll) throw new Error("scroll container not found");
  return scroll;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  searchStockImages.mockReset();
  importStockImage.mockReset();
  uploadDocumentImage.mockReset();
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("ImagePickerModal — Search images tab", () => {
  it("auto-loads the default illustration search on the first page when the tab opens", async () => {
    searchStockImages.mockResolvedValue(page([image("1")]));
    mount({ documentId: "doc-1" });
    expect(searchStockImages).not.toHaveBeenCalled();

    await openImagesTab();

    expect(searchStockImages).toHaveBeenCalledTimes(1);
    expect(searchStockImages).toHaveBeenCalledWith("doc-1", DEFAULT_QUERY, {
      type: "illustration",
      page: 1,
      locale: "pt-PT",
    });
    expect(searchInput().value).toBe(DEFAULT_QUERY);
    expect(filterChip("imagesFilterIllustrations").getAttribute("aria-pressed")).toBe("true");
    expect(thumbnails()).toHaveLength(1);
  });

  it("uses the supplied slide/document suggestion instead of the generic default", async () => {
    searchStockImages.mockResolvedValue(page([image("1")]));
    mount({ initialSearchQuery: "Ciclo da água" });
    await openImagesTab();

    expect(searchStockImages).toHaveBeenCalledWith("doc-1", "Ciclo da água", expect.objectContaining({ page: 1 }));
    expect(searchInput().value).toBe("Ciclo da água");
  });

  it("keeps thumbnails lazy-loaded", async () => {
    searchStockImages.mockResolvedValue(page([image("1"), image("2")]));
    mount();
    await openImagesTab();

    const imgs = thumbnails();
    expect(imgs).toHaveLength(2);
    for (const img of imgs) expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("submitting an empty search resets to the default suggestion and filter", async () => {
    searchStockImages.mockResolvedValue(page([image("1")]));
    mount({ initialSearchQuery: "Fotossíntese" });
    await openImagesTab();
    await act(async () => {
      filterChip("imagesFilterPhotos").click();
    });
    await flush();
    expect(searchStockImages).toHaveBeenLastCalledWith("doc-1", "Fotossíntese", expect.objectContaining({ type: "photo" }));

    await act(async () => {
      typeInto(searchInput(), "");
    });
    const form = searchInput().closest("form");
    if (!form) throw new Error("form missing");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flush();

    expect(searchStockImages).toHaveBeenLastCalledWith(
      "doc-1",
      "Fotossíntese",
      expect.objectContaining({ type: "illustration", page: 1 }),
    );
    expect(searchInput().value).toBe("Fotossíntese");
    expect(filterChip("imagesFilterIllustrations").getAttribute("aria-pressed")).toBe("true");
  });

  it("the 'all' filter sends no type restriction", async () => {
    searchStockImages.mockResolvedValue(page([image("1")]));
    mount();
    await openImagesTab();
    await act(async () => {
      filterChip("imagesFilterAll").click();
    });
    await flush();

    expect(searchStockImages).toHaveBeenLastCalledWith(
      "doc-1",
      DEFAULT_QUERY,
      expect.objectContaining({ type: undefined, page: 1 }),
    );
  });

  it("loads the next page through the sentinel observed inside the scroll container, not the window", async () => {
    searchStockImages
      .mockResolvedValueOnce(page([image("1"), image("2")], { page: 1, hasMore: true }))
      .mockResolvedValueOnce(page([image("3")], { page: 2, hasMore: false }));
    mount();
    await openImagesTab();

    const observer = FakeIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();
    expect(observer?.root).toBe(scrollContainer());

    await act(async () => observer?.fire(true));
    await flush();

    expect(searchStockImages).toHaveBeenLastCalledWith(
      "doc-1",
      DEFAULT_QUERY,
      expect.objectContaining({ type: "illustration", page: 2 }),
    );
    expect(thumbnails()).toHaveLength(3);
    expect(loadMoreButton()).toBeUndefined();
  });

  it("single-flights repeated observer events while a page is pending", async () => {
    const pending = deferred<StockImageSearchResponse>();
    searchStockImages
      .mockResolvedValueOnce(page([image("1")], { hasMore: true }))
      .mockReturnValueOnce(pending.promise);
    mount();
    await openImagesTab();

    const observer = FakeIntersectionObserver.instances.at(-1);
    await act(async () => {
      observer?.fire(true);
      observer?.fire(true);
      observer?.fire(true);
    });

    const pageTwoCalls = searchStockImages.mock.calls.filter((c) => (c[2] as { page: number }).page === 2);
    expect(pageTwoCalls).toHaveLength(1);

    await act(async () => {
      pending.resolve(page([image("2")], { page: 2, hasMore: false }));
    });
    await flush();
    expect(thumbnails()).toHaveLength(2);
  });

  it("de-duplicates image ids across pages", async () => {
    searchStockImages
      .mockResolvedValueOnce(page([image("1"), image("2")], { hasMore: true }))
      .mockResolvedValueOnce(page([image("2"), image("3")], { page: 2, hasMore: false }));
    mount();
    await openImagesTab();
    await act(async () => {
      FakeIntersectionObserver.instances.at(-1)?.fire(true);
    });
    await flush();

    const alts = thumbnails().map((img) => img.getAttribute("alt"));
    expect(alts).toEqual(["Image 1", "Image 2", "Image 3"]);
  });

  it("keeps existing results when a later page fails, retries the exact page, and does not auto-retry", async () => {
    searchStockImages
      .mockResolvedValueOnce(page([image("1")], { hasMore: true }))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(page([image("2")], { page: 2, hasMore: false }));
    mount();
    await openImagesTab();

    await act(async () => {
      FakeIntersectionObserver.instances.at(-1)?.fire(true);
    });
    await flush();

    expect(thumbnails()).toHaveLength(1);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("imagesLoadMoreError");
    const callsAfterFailure = searchStockImages.mock.calls.length;

    // A further observer event (e.g. the sentinel re-entering) must not trigger another automatic attempt.
    await act(async () => {
      FakeIntersectionObserver.instances.at(-1)?.fire(true);
    });
    await flush();
    expect(searchStockImages.mock.calls.length).toBe(callsAfterFailure);

    await act(async () => {
      loadMoreButton()?.click();
    });
    await flush();
    expect(searchStockImages).toHaveBeenLastCalledWith(
      "doc-1",
      DEFAULT_QUERY,
      expect.objectContaining({ page: 2 }),
    );
    expect(thumbnails()).toHaveLength(2);
  });

  it("offers a manual Load more button when IntersectionObserver is unsupported", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    searchStockImages
      .mockResolvedValueOnce(page([image("1")], { hasMore: true }))
      .mockResolvedValueOnce(page([image("2")], { page: 2, hasMore: false }));
    mount();
    await openImagesTab();

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    const button = loadMoreButton();
    expect(button?.textContent).toBe("imagesLoadMore");
    await act(async () => {
      button?.click();
    });
    await flush();
    expect(thumbnails()).toHaveLength(2);
  });

  it("ignores a stale response superseded by a newer search", async () => {
    const slow = deferred<StockImageSearchResponse>();
    searchStockImages
      .mockResolvedValueOnce(page([image("1")]))
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(page([image("9")]));
    mount({ initialSearchQuery: "Rios" });
    await openImagesTab();

    await act(async () => {
      filterChip("imagesFilterDiagrams").click(); // in flight: slow
    });
    await act(async () => {
      filterChip("imagesFilterPhotos").click(); // newer: resolves immediately
    });
    await flush();
    await act(async () => {
      slow.resolve(page([image("stale")]));
    });
    await flush();

    expect(thumbnails().map((img) => img.getAttribute("alt"))).toEqual(["Image 9"]);
  });

  it("a query/filter change resets pagination to page 1", async () => {
    searchStockImages
      .mockResolvedValueOnce(page([image("1")], { hasMore: true }))
      .mockResolvedValueOnce(page([image("2")], { page: 2, hasMore: true }))
      .mockResolvedValueOnce(page([image("7")], { page: 1, hasMore: true }));
    mount();
    await openImagesTab();
    await act(async () => {
      FakeIntersectionObserver.instances.at(-1)?.fire(true);
    });
    await flush();

    await act(async () => {
      filterChip("imagesFilterDiagrams").click();
    });
    await flush();

    expect(searchStockImages).toHaveBeenLastCalledWith(
      "doc-1",
      DEFAULT_QUERY,
      expect.objectContaining({ type: "diagram", page: 1 }),
    );
    expect(thumbnails().map((img) => img.getAttribute("alt"))).toEqual(["Image 7"]);
  });

  it("stops offering more pages once hasMore is false", async () => {
    searchStockImages.mockResolvedValueOnce(page([image("1")], { hasMore: false }));
    mount();
    await openImagesTab();

    expect(thumbnails()).toHaveLength(1);
    expect(loadMoreButton()).toBeUndefined();
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    await act(async () => {
      FakeIntersectionObserver.instances.at(-1)?.fire(true);
    });
    expect(searchStockImages).toHaveBeenCalledTimes(1);
  });

  it("disconnects the observer on unmount", async () => {
    searchStockImages.mockResolvedValueOnce(page([image("1")], { hasMore: true }));
    mount();
    await openImagesTab();
    const observer = FakeIntersectionObserver.instances.at(-1);
    expect(observer?.disconnected).toBe(false);

    act(() => root.unmount());
    expect(observer?.disconnected).toBe(true);
    root = createRoot(container);
  });

  it("re-runs the default search for a different document without showing the old results", async () => {
    searchStockImages
      .mockResolvedValueOnce(page([image("doc1-img")]))
      .mockResolvedValueOnce(page([image("doc2-img")]));
    const view = renderModal({ documentId: "doc-1" });
    await openImagesTab();
    expect(thumbnails().map((img) => img.getAttribute("alt"))).toEqual(["Image doc1-img"]);

    view.rerender({ documentId: "doc-2" });
    await flush();

    expect(searchStockImages).toHaveBeenLastCalledWith(
      "doc-2",
      DEFAULT_QUERY,
      expect.objectContaining({ type: "illustration", page: 1 }),
    );
  });
});
