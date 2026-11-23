import { describe, expect, it } from "vitest";
import { countryFromGeoHeaders, type HeaderReader } from "./countryFromHeaders";

function headersOf(values: Record<string, string>): HeaderReader {
  const lower = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return { get: (name) => lower[name.toLowerCase()] ?? null };
}

describe("countryFromGeoHeaders", () => {
  it("returns BR from the Vercel geo header", () => {
    expect(countryFromGeoHeaders(headersOf({ "x-vercel-ip-country": "BR" }))).toBe("BR");
  });

  it("returns PT from the Vercel geo header", () => {
    expect(countryFromGeoHeaders(headersOf({ "x-vercel-ip-country": "PT" }))).toBe("PT");
  });

  it("reads the Cloudflare header when the Vercel one is absent", () => {
    expect(countryFromGeoHeaders(headersOf({ "cf-ipcountry": "br" }))).toBe("BR");
  });

  it("reads the generic x-country-code header last", () => {
    expect(countryFromGeoHeaders(headersOf({ "x-country-code": "BR" }))).toBe("BR");
  });

  it("prefers the Vercel header over the others", () => {
    expect(
      countryFromGeoHeaders(
        headersOf({ "x-vercel-ip-country": "PT", "cf-ipcountry": "BR" }),
      ),
    ).toBe("PT");
  });

  it("skips an unsupported country and falls through to the next header", () => {
    expect(
      countryFromGeoHeaders(
        headersOf({ "x-vercel-ip-country": "US", "cf-ipcountry": "BR" }),
      ),
    ).toBe("BR");
  });

  it("falls back to PT for unsupported countries", () => {
    expect(countryFromGeoHeaders(headersOf({ "x-vercel-ip-country": "US" }))).toBe("PT");
  });

  it("falls back to PT for Cloudflare's unknown markers", () => {
    expect(countryFromGeoHeaders(headersOf({ "cf-ipcountry": "XX" }))).toBe("PT");
    expect(countryFromGeoHeaders(headersOf({ "cf-ipcountry": "T1" }))).toBe("PT");
  });

  it("falls back to PT when no geo header is present", () => {
    expect(countryFromGeoHeaders(headersOf({}))).toBe("PT");
  });
});
