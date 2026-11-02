// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/sign-up", replace: vi.fn(), signedIn: false }));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: nav.signedIn }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace }),
}));

import { SsoCallbackGuard } from "./SsoCallbackGuard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function open(pathname: string, signedIn: boolean) {
  nav.pathname = pathname;
  nav.signedIn = signedIn;
  act(() => root.render(createElement(SsoCallbackGuard, null, createElement("p", null, "clerk"))));
  const shown = container.textContent === "clerk";
  act(() => root.render(createElement("div")));
  return shown;
}

beforeEach(() => {
  sessionStorage.clear();
  nav.replace.mockClear();
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => act(() => root.unmount()));

describe("SsoCallbackGuard", () => {
  it("lets Clerk finish a fresh callback, then sends a Back revisit to the dashboard", () => {
    expect(open("/sign-up", false)).toBe(true);
    // Fresh callback: Clerk may already see the session, and must still handle its own redirect.
    expect(open("/sign-up/sso-callback", true)).toBe(true);
    expect(nav.replace).not.toHaveBeenCalled();

    expect(open("/sign-up/sso-callback", true)).toBe(false);
    expect(nav.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("treats a callback as fresh again after the sign-in form was shown", () => {
    open("/sign-up/sso-callback", true);
    open("/sign-in", false);
    expect(open("/sign-in/sso-callback", true)).toBe(true);
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
