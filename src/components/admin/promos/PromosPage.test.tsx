// @vitest-environment jsdom
import { ApiRequestError } from "@/services/api/client";
import type { AdminTrialPromo } from "@/shared/types/trial-promo";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns}.${key}${values ? ` ${JSON.stringify(values)}` : ""}`,
  useLocale: () => "pt-PT",
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, isLoaded: true }) }));
vi.mock("sonner", () => ({ toast: { error: m.toastError, success: m.toastSuccess } }));
vi.mock("@/services/api/admin-trial-promos.service", () => ({
  adminTrialPromosService: { list: m.list, create: m.create, update: m.update },
}));
vi.mock("qrcode", () => ({
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,AAAA"),
  toString: vi.fn().mockResolvedValue("<svg/>"),
}));

import { PromosPage } from "./PromosPage";

const LIS: AdminTrialPromo = {
  code: "LIS2026",
  name: "Learning Innovation Summit",
  extraDays: 30,
  validFrom: null,
  validUntil: "2026-12-31T23:59:59Z",
  maxRedemptions: 200,
  active: true,
  redemptions: 12,
  signupUrl: "https://create.scooli.app/sign-up?promo=LIS2026",
  createdAt: "2026-11-01T10:00:00Z",
};
const OPEN: AdminTrialPromo = { ...LIS, code: "OPEN", name: "Open", maxRedemptions: null, redemptions: 3, active: false, signupUrl: "https://x/?promo=OPEN" };

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function render() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const created = createRoot(el);
  root = created;
  host = el;
  await act(async () => {
    created.render(createElement(PromosPage));
  });
  await flush();
  return el;
}

function type(el: Element | null, value: string) {
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set as (v: string) => void;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submitCreate(view: HTMLElement, name: string, code = "") {
  type(view.querySelector("#promo-name"), name);
  type(view.querySelector("#promo-code"), code);
  await act(async () => {
    view.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
}

beforeEach(() => {
  Object.values(m).forEach((fn) => fn.mockReset());
  m.list.mockResolvedValue([LIS, OPEN]);
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("PromosPage (ENG-360)", () => {
  it("lists the promos with code, name, extra days, active state and redemptions", async () => {
    const view = await render();
    const lis = view.querySelector('[data-testid="promo-row-LIS2026"]') as HTMLElement;
    expect(lis.textContent).toContain("LIS2026");
    expect(lis.textContent).toContain("Learning Innovation Summit");
    expect(lis.textContent).toContain("12/200");
    expect(lis.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("true");
    const open = view.querySelector('[data-testid="promo-row-OPEN"]') as HTMLElement;
    expect(open.textContent).toMatch(/3(?!\/)/);
    expect(open.textContent).not.toContain("3/");
    expect(open.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("false");
  });

  it("shows each sign-up link and a QR of exactly that link", async () => {
    const qr = await import("qrcode");
    const view = await render();
    expect(view.textContent).toContain(LIS.signupUrl);
    expect(qr.toDataURL).toHaveBeenCalledWith(LIS.signupUrl, expect.anything());
    expect(view.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,AAAA");
  });

  it("creates a promo with the form values, then refreshes the list", async () => {
    m.create.mockResolvedValue({ ...LIS, code: "NEW1", name: "New" });
    const view = await render();
    type(view.querySelector("#promo-days"), "45");
    type(view.querySelector("#promo-max"), "50");
    await submitCreate(view, "  New  ", "new1");
    expect(m.create).toHaveBeenCalledWith({ name: "New", code: "NEW1", extraDays: 45, maxRedemptions: 50 });
    expect(m.list).toHaveBeenCalledTimes(2);
  });

  it("omits the code when left empty and defaults to 30 extra days", async () => {
    m.create.mockResolvedValue(LIS);
    const view = await render();
    await submitCreate(view, "Summit");
    expect(m.create).toHaveBeenCalledWith({ name: "Summit", extraDays: 30 });
  });

  it("does not post without a name", async () => {
    const view = await render();
    await submitCreate(view, "   ");
    expect(m.create).not.toHaveBeenCalled();
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("errors.nameRequired");
  });

  it("shows a 409 as a code-taken error and keeps the form", async () => {
    m.create.mockRejectedValue(new ApiRequestError("conflict", 409, "promo_code_taken"));
    const view = await render();
    await submitCreate(view, "Dup", "LIS2026");
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("errors.codeTaken");
    expect((view.querySelector("#promo-name") as HTMLInputElement).value).toBe("Dup");
    expect(m.list).toHaveBeenCalledTimes(1);
  });

  it("shows a 400 with the server's reason", async () => {
    m.create.mockRejectedValue(new ApiRequestError("extraDays too high", 400, "invalid_promo"));
    const view = await render();
    await submitCreate(view, "Bad");
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("extraDays too high");
  });

  it("PATCHes {active} when the toggle is clicked and shows the returned item", async () => {
    m.update.mockResolvedValue({ ...LIS, active: false });
    const view = await render();
    const toggle = view.querySelector('[data-testid="promo-row-LIS2026"] [role="switch"]') as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    await flush();
    expect(m.update).toHaveBeenCalledWith("LIS2026", { active: false });
    expect(
      view.querySelector('[data-testid="promo-row-LIS2026"] [role="switch"]')?.getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("keeps the old state and reports when the toggle fails", async () => {
    m.update.mockRejectedValue(new ApiRequestError("boom", 500, null));
    const view = await render();
    await act(async () => {
      (view.querySelector('[data-testid="promo-row-LIS2026"] [role="switch"]') as HTMLButtonElement).click();
    });
    await flush();
    expect(m.toastError).toHaveBeenCalled();
    expect(
      view.querySelector('[data-testid="promo-row-LIS2026"] [role="switch"]')?.getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("edits name, valid until and max redemptions, sending only what changed", async () => {
    m.update.mockResolvedValue({ ...LIS, name: "Renamed" });
    const view = await render();
    await act(async () => {
      (view.querySelector('[data-testid="promo-row-LIS2026"] button[aria-label*="row.edit"]') as HTMLButtonElement).click();
    });
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    type(dialog.querySelector("#promo-edit-name"), "Renamed");
    await act(async () => {
      dialog.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flush();
    expect(m.update).toHaveBeenCalledWith("LIS2026", { name: "Renamed" });
    expect(view.textContent).toContain("Renamed");
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});
