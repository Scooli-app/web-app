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
    expect(normalizePromoCode(" feira ")).toBe("FEIRA");
    expect(normalizePromoCode("Feira-2026_b")).toBe("FEIRA-2026_B");
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
    expect(promoCodeFromSearch("?promo=feira")).toBe("FEIRA");
  });

  it("reads the code inside redirect_url (sign-in after a protected page), relative or absolute", () => {
    expect(promoCodeFromSearch(`?redirect_url=${encodeURIComponent("/dashboard?promo=feira")}`)).toBe("FEIRA");
    expect(
      promoCodeFromSearch(`?redirect_url=${encodeURIComponent("https://create.scooli.app/checkout?promo=Feira")}`),
    ).toBe("FEIRA");
  });

  it("is null without a usable code", () => {
    expect(promoCodeFromSearch("")).toBeNull();
    expect(promoCodeFromSearch("?promo=%20")).toBeNull();
    expect(promoCodeFromSearch("?redirect_url=%2Fdashboard")).toBeNull();
  });
});

describe("cookie encoding", () => {
  it("round-trips and rejects junk", () => {
    const promo = { code: "FEIRA", capturedAt: NOW, attempts: 2 };
    expect(parsePromoCookie(encodePromoCookie(promo))).toEqual(promo);
    expect(parsePromoCookie("FEIRA.abc.0")).toBeNull();
    expect(parsePromoCookie("")).toBeNull();
    expect(parsePromoCookie("%E0%A4%A")).toBeNull();
  });
});

describe("captureTrialPromo / readStoredPromo", () => {
  it("stores the code with its timestamp in localStorage and in a first-party cookie", () => {
    captureTrialPromo("FEIRA", NOW);
    expect(JSON.parse(localStorage.getItem(TRIAL_PROMO_STORAGE_KEY) ?? "null")).toEqual({
      code: "FEIRA",
      capturedAt: NOW,
      attempts: 0,
    });
    expect(cookieValue()).toBe(`FEIRA.${NOW}.0`);
    expect(readStoredPromo(NOW + DAY)).toEqual({ code: "FEIRA", capturedAt: NOW, attempts: 0 });
  });

  it("survives on the cookie alone (another tab after Clerk's redirect, or blocked localStorage)", () => {
    captureTrialPromo("FEIRA", NOW);
    localStorage.clear();
    expect(readStoredPromo(NOW)?.code).toBe("FEIRA");
  });

  it("reads a cookie the middleware set before any JS ran", () => {
    document.cookie = `${TRIAL_PROMO_COOKIE_NAME}=${encodePromoCookie({ code: "FEIRA", capturedAt: NOW, attempts: 0 })}; Path=/`;
    expect(readStoredPromo(NOW)?.code).toBe("FEIRA");
  });

  it("expires the code 7 days after the scan and clears both copies", () => {
    captureTrialPromo("FEIRA", NOW);
    expect(readStoredPromo(NOW + TRIAL_PROMO_TTL_MS - 1)?.code).toBe("FEIRA");
    expect(readStoredPromo(NOW + TRIAL_PROMO_TTL_MS)).toBeNull();
    expect(localStorage.getItem(TRIAL_PROMO_STORAGE_KEY)).toBeNull();
    expect(cookieValue()).toBeNull();
  });

  it("a re-scan of the same code refreshes the 7 days but keeps the attempts; a new code starts over", () => {
    writeStoredPromo({ code: "FEIRA", capturedAt: NOW, attempts: 2 }, NOW);
    expect(captureTrialPromo("FEIRA", NOW + 6 * DAY)).toEqual({ code: "FEIRA", capturedAt: NOW + 6 * DAY, attempts: 2 });
    expect(readStoredPromo(NOW + 8 * DAY)?.code).toBe("FEIRA");
    expect(captureTrialPromo("OUTRA", NOW + 8 * DAY).attempts).toBe(0);
  });

  it("prefers the newer copy when localStorage and the cookie disagree", () => {
    localStorage.setItem(TRIAL_PROMO_STORAGE_KEY, JSON.stringify({ code: "OLD", capturedAt: NOW, attempts: 1 }));
    document.cookie = `${TRIAL_PROMO_COOKIE_NAME}=${encodePromoCookie({ code: "FEIRA", capturedAt: NOW + DAY, attempts: 0 })}; Path=/`;
    expect(readStoredPromo(NOW + DAY)?.code).toBe("FEIRA");
  });

  it("ignores a corrupt localStorage entry", () => {
    localStorage.setItem(TRIAL_PROMO_STORAGE_KEY, "{not json");
    expect(readStoredPromo(NOW)).toBeNull();
  });
});
