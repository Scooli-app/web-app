import { toDataURL, toString as qrToString } from "qrcode";

export type PromoQrFormat = "png" | "svg";

/** Side of the PNG for print: well over the 1024 px minimum. */
export const PROMO_QR_PNG_SIZE = 1536;
const PREVIEW_SIZE = 192;
const BASE_OPTIONS = { errorCorrectionLevel: "M", margin: 2 } as const;

export function promoQrFilename(code: string, format: PromoQrFormat): string {
  return `scooli-promo-${code}.${format}`;
}

/** Small data URL for the on-page preview. Encodes `signupUrl` exactly as given. */
export function promoQrPreview(signupUrl: string): Promise<string> {
  return toDataURL(signupUrl, { ...BASE_OPTIONS, width: PREVIEW_SIZE });
}

function dataUrlToBlob(dataUrl: string, type: string): Blob {
  const bytes = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type });
}

/** The print-ready file for a promo link, generated client-side. */
export async function buildPromoQrFile(signupUrl: string, format: PromoQrFormat): Promise<Blob> {
  if (format === "svg") {
    const svg = await qrToString(signupUrl, { ...BASE_OPTIONS, type: "svg" });
    return new Blob([svg], { type: "image/svg+xml" });
  }
  const dataUrl = await toDataURL(signupUrl, { ...BASE_OPTIONS, width: PROMO_QR_PNG_SIZE, type: "image/png" });
  return dataUrlToBlob(dataUrl, "image/png");
}

/** Builds the QR file and saves it as `scooli-promo-{CODE}.png|svg`. */
export async function downloadPromoQr(code: string, signupUrl: string, format: PromoQrFormat): Promise<void> {
  const blob = await buildPromoQrFile(signupUrl, format);
  const href = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = href;
    link.download = promoQrFilename(code, format);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(href);
  }
}
