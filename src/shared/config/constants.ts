/**
 * Application constants and configuration
 */

export const MAX_LENGTHS = {
  DOCUMENT_TITLE: 50,
} as const;

export const AUTO_SAVE_DELAY = 3000;

export const MARKETING_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://www.scooli.app"
    : "http://localhost:3001");
