import { isSupportedLocale, type Locale } from "./locales";

/**
 * Pages live under a hidden `[locale]` segment so each one is prerendered once
 * per language. Middleware rewrites `/x` to `/{locale}/x`; public URLs never
 * carry the locale. These are the path rules it uses.
 */

/** Route handlers, proxies and files that are not under `[locale]`. */
const NEVER_REWRITE = ["/api", "/trpc", "/webhooks", "/.well-known", "/_ph", "/ingest", "/_next"];
const NEVER_REWRITE_FILES = ["/robots.txt", "/sitemap.xml"];

export function localePrefixOf(pathname: string): Locale | null {
  const first = pathname.split("/")[1];
  return isSupportedLocale(first) ? first : null;
}

export function isLocaleRewritable(pathname: string): boolean {
  if (NEVER_REWRITE_FILES.includes(pathname)) return false;
  if (NEVER_REWRITE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return localePrefixOf(pathname) === null;
}

export function withLocalePrefix(pathname: string, locale: Locale): string {
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

export function withoutLocalePrefix(pathname: string): string {
  const locale = localePrefixOf(pathname);
  if (!locale) return pathname;
  return pathname.slice(locale.length + 1) || "/";
}
