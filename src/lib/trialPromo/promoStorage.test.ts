// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  TRIAL_PROMO_COOKIE_NAME,
  TRIAL_PROMO_STORAGE_KEY,
  TRIAL_PROMO_TTL_MS,
  captureTrialPromo,
  clearStoredPromo,
  encodePromoCookie,
  normalizePromoCode,
  parsePromoCookie,
  promoCodeFromSearch,
  readStoredPromo,
  writeStoredPromo,
} from "./promoStorage";

const NOW = Date.UTC(2026, 10, 14, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function cookieValue(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TRIAL_PROMO_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

afterEach(() => {
  clearStoredPromo();
  localStorage.clear();
});

describe("normalizePromoCode (ENG-360)", () => {
  it("trims and upper-cases the code", () => {
    expect(normalizePromoCode(" lis2026 ")).toBe("LIS2026");
    expect(normalizePromoCode("Promo-2026_b")).toBe("PROMO-2026_B");
  });

  it("rejects anything that cannot be a code", () => {
    expect(normalizePromoCode("")).toBeNull();
    expect(normalizePromoCode("x")).toBeNull();
    expect(normalizePromoCode("FEI RA")).toBeNull();
    expect(normalizePromoCode("<script>")).toBeNull();
    expect(normalizePromoCode("A".repeat(33))).toBeNull();
    expect(normalizePromoCode(null)).toBeNull();
    expect(normalizePromoCode(42)).toBeNull();
  });
});

describe("promoCodeFromSearch", () => {
  it("reads ?promo= directly", () => {
    expect(promoCodeFromSearch("?promo=lis2026")).toBe("LIS2026");
  });

  it("reads the code inside redirect_url (sign-in after a protected page), relative or absolute", () => {
    expect(promoCodeFromSearch(`?redirect_url=${encodeURIComponent("/dashboard?promo=lis2026")}`)).toBe("LIS2026");
    expect(
      promoCodeFromSearch(`?redirect_url=${encodeURIComponent("https://create.scooli.app/checkout?promo=Lis2026")}`),
    ).toBe("LIS2026");
  });

  it("is null without a usable code", () => {
    expect(promoCodeFromSearch("")).toBeNull();
    expect(promoCodeFromSearch("?promo=%20")).toBeNull();
    expect(promoCodeFromSearch("?redirect_url=%2Fdashboard")).toBeNull();
  });
});

describe("cookie encoding", () => {
  it("round-trips and rejects junk", () => {
    const promo = { code: "LIS2026", capturedAt: NOW, attempts: 2 };
    expect(parsePromoCookie(encodePromoCookie(promo))).toEqual(promo);
    expect(parsePromoCookie("LIS2026.abc.0")).toBeNull();
    expect(parsePromoCookie("")).toBeNull();
    expect(parsePromoCookie("%E0%A4%A")).toBeNull();
  });
});

describe("captureTrialPromo / readStoredPromo", () => {
  it("stores the code with its timestamp in localStorage and in a first-party cookie", () => {
    captureTrialPromo("LIS2026", NOW);
    expect(JSON.parse(localStorage.getItem(TRIAL_PROMO_STORAGE_KEY) ?? "null")).toEqual({
      code: "LIS2026",
      capturedAt: NOW,
      attempts: 0,
    });
    expect(cookieValue()).toBe(`LIS2026.${NOW}.0`);
    expect(readStoredPromo(NOW + DAY)).toEqual({ code: "LIS2026", capturedAt: NOW, attempts: 0 });
  });

  it("survives on the cookie alone (another tab after Clerk's redirect, or blocked localStorage)", () => {
    captureTrialPromo("LIS2026", NOW);
    localStorage.clear();
    expect(readStoredPromo(NOW)?.code).toBe("LIS2026");
  });

  it("reads a cookie the middleware set before any JS ran", () => {
    document.cookie = `${TRIAL_PROMO_COOKIE_NAME}=${encodePromoCookie({ code: "LIS2026", capturedAt: NOW, attempts: 0 })}; Path=/`;
    expect(readStoredPromo(NOW)?.code).toBe("LIS2026");
  });

  it("expires the code 7 days after the scan and clears both copies", () => {
    captureTrialPromo("LIS2026", NOW);
    expect(readStoredPromo(NOW + TRIAL_PROMO_TTL_MS - 1)?.code).toBe("LIS2026");
    expect(readStoredPromo(NOW + TRIAL_PROMO_TTL_MS)).toBeNull();
    expect(localStorage.getItem(TRIAL_PROMO_STORAGE_KEY)).toBeNull();
    expect(cookieValue()).toBeNull();
  });

  it("a re-scan of the same code refreshes the 7 days but keeps the attempts; a new code starts over", () => {
    writeStoredPromo({ code: "LIS2026", capturedAt: NOW, attempts: 2 }, NOW);
    expect(captureTrialPromo("LIS2026", NOW + 6 * DAY)).toEqual({ code: "LIS2026", capturedAt: NOW + 6 * DAY, attempts: 2 });
    expect(readStoredPromo(NOW + 8 * DAY)?.code).toBe("LIS2026");
    expect(captureTrialPromo("OUTRA", NOW + 8 * DAY).attempts).toBe(0);
  });

  it("prefers the newer copy when localStorage and the cookie disagree", () => {
    localStorage.setItem(TRIAL_PROMO_STORAGE_KEY, JSON.stringify({ code: "OLD", capturedAt: NOW, attempts: 1 }));
    document.cookie = `${TRIAL_PROMO_COOKIE_NAME}=${encodePromoCookie({ code: "LIS2026", capturedAt: NOW + DAY, attempts: 0 })}; Path=/`;
    expect(readStoredPromo(NOW + DAY)?.code).toBe("LIS2026");
  });

  it("ignores a corrupt localStorage entry", () => {
    localStorage.setItem(TRIAL_PROMO_STORAGE_KEY, "{not json");
    expect(readStoredPromo(NOW)).toBeNull();
  });
});
