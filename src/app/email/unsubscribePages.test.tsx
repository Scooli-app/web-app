// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ replace: nav.replace }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => createElement("a", { href }, children as never),
}));
vi.mock("@/components/auth/AuthLayout", () => ({
  AuthLayout: ({ children }: { children: unknown }) => createElement("main", null, children as never),
}));

import { emailCategory } from "./emailCategory";
import EmailUnsubscribePage from "./unsubscribe/page";
import EmailUnsubscribedPage from "./unsubscribed/page";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(page: () => unknown, query: string): HTMLDivElement {
  nav.params = new URLSearchParams(query);
  const el = document.createElement("div");
  document.body.appendChild(el);
  const created = createRoot(el);
  act(() => created.render(createElement(page as never)));
  root = created;
  host = el;
  return el;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  nav.replace.mockReset();
  vi.unstubAllGlobals();
});

describe("emailCategory", () => {
  it("reads pro_trial and keeps the weekly digest for a missing or unknown category", () => {
    expect(emailCategory("pro_trial")).toBe("pro_trial");
    expect(emailCategory(null)).toBe("weekly_digest");
    expect(emailCategory("weekly_digest")).toBe("weekly_digest");
    expect(emailCategory("something_else")).toBe("weekly_digest");
  });
});

describe("/email/unsubscribe", () => {
  it("asks about the weekly email when the link has no category (today's behaviour)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const view = render(EmailUnsubscribePage, "token=t1");

    expect(view.textContent).toContain("emailUnsubscribe.title");
    expect(view.textContent).toContain("emailUnsubscribe.hint");
    expect(view.textContent).not.toContain("proTrial");

    await act(async () => {
      view.querySelector("button")?.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(nav.replace).toHaveBeenCalledWith("/email/unsubscribed?category=weekly_digest");
  });

  it("keeps the weekly wording for an unknown category", () => {
    const view = render(EmailUnsubscribePage, "token=t1&category=newsletter");
    expect(view.textContent).toContain("emailUnsubscribe.title");
    expect(view.textContent).not.toContain("proTrial");
  });

  it("asks about the Pro month emails for category=pro_trial, then confirms for that category", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(EmailUnsubscribePage, "token=t%2B2&category=pro_trial");

    expect(view.textContent).toContain("emailUnsubscribe.proTrial.title");
    expect(view.textContent).toContain("emailUnsubscribe.proTrial.hint");
    expect(view.textContent).not.toContain("emailUnsubscribe.title");

    await act(async () => {
      view.querySelector("button")?.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/email/unsubscribe?token=t%2B2"), { method: "POST" });
    expect(nav.replace).toHaveBeenCalledWith("/email/unsubscribed?category=pro_trial");
  });
});

describe("/email/unsubscribed", () => {
  it("says the weekly email stopped and links to settings by default", () => {
    const view = render(EmailUnsubscribedPage, "category=weekly_digest");
    expect(view.textContent).toContain("emailUnsubscribed.done");
    expect(view.querySelector("a")?.getAttribute("href")).toBe("/settings#planning");
  });

  it("says the Pro month emails stopped for category=pro_trial, and opens the app", () => {
    const view = render(EmailUnsubscribedPage, "category=pro_trial");
    expect(view.textContent).toContain("emailUnsubscribed.proTrial.done");
    expect(view.textContent).not.toContain("emailUnsubscribed.hint");
    expect(view.querySelector("a")?.getAttribute("href")).toBe("/dashboard");
  });

  it("keeps the invalid-link state whatever the category", () => {
    const view = render(EmailUnsubscribedPage, "error=invalid&category=pro_trial");
    expect(view.textContent).toContain("emailUnsubscribed.invalid");
    expect(view.textContent).not.toContain("proTrial");
  });
});
