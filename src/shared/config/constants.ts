/**
 * Application constants and configuration
 */

export const MAX_LENGTHS = {
  DOCUMENT_TITLE: 50,
} as const;

export const AUTO_SAVE_DELAY = 3000;

/**
 * How long a document may stay in generating/processing before the editor stops
 * showing an indefinite spinner and offers a "check again" action. Normal AI
 * generation finishes in roughly 30-60s; this ceiling is deliberately generous.
 */
export const DOCUMENT_GENERATION_STALL_THRESHOLD_MS = 5 * 60 * 1000;

export const MARKETING_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://www.scooli.app"
    : "http://localhost:3001");
