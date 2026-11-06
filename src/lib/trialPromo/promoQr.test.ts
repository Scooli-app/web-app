// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const qr = vi.hoisted(() => ({ toDataURL: vi.fn(), toString: vi.fn() }));
vi.mock("qrcode", () => qr);

import { buildPromoQrFile, downloadPromoQr, promoQrFilename, PROMO_QR_PNG_SIZE } from "./promoQr";

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

const URL_IN = "https://create.scooli.app/sign-up?promo=LIS2026";
// "PNG" as base64, enough to check the bytes survive.
const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

describe("promo QR files (ENG-360)", () => {
  let clicked: HTMLAnchorElement[];
  let blobs: Blob[];

  beforeEach(() => {
    qr.toDataURL.mockReset().mockResolvedValue(PNG_DATA_URL);
    qr.toString.mockReset().mockResolvedValue("<svg xmlns='http://www.w3.org/2000/svg'/>");
    clicked = [];
    blobs = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), "blob:fake"));
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("names files scooli-promo-{CODE}.png / .svg", () => {
    expect(promoQrFilename("LIS2026", "png")).toBe("scooli-promo-LIS2026.png");
    expect(promoQrFilename("LIS2026", "svg")).toBe("scooli-promo-LIS2026.svg");
  });

  it("downloads a PNG of at least 1024 px that encodes the URL exactly as given", async () => {
    await downloadPromoQr("LIS2026", URL_IN, "png");
    expect(qr.toDataURL).toHaveBeenCalledWith(URL_IN, expect.objectContaining({ width: PROMO_QR_PNG_SIZE }));
    expect(PROMO_QR_PNG_SIZE).toBeGreaterThanOrEqual(1024);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("scooli-promo-LIS2026.png");
    expect(blobs[0].type).toBe("image/png");
    expect(blobs[0].size).toBeGreaterThan(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("downloads an SVG file with the same URL", async () => {
    await downloadPromoQr("LIS2026", URL_IN, "svg");
    expect(qr.toString).toHaveBeenCalledWith(URL_IN, expect.objectContaining({ type: "svg" }));
    expect(clicked[0].download).toBe("scooli-promo-LIS2026.svg");
    expect(new TextDecoder().decode(await readBlob(blobs[0]))).toContain("<svg");
    expect(blobs[0].type).toBe("image/svg+xml");
  });

  it("builds the PNG bytes from the data URL", async () => {
    const blob = await buildPromoQrFile(URL_IN, "png");
    const bytes = new Uint8Array(await readBlob(blob));
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
