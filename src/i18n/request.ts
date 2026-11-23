import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isSupportedLocale, LOCALE_COOKIE_NAME, resolveRequestLocale } from "./locales";

/**
 * Resolves the request locale.
 *
 * Pages live under a hidden `[locale]` segment: middleware rewrites `/x` to
 * `/{locale}/x` from the `NEXT_LOCALE` cookie (pt-PT when missing or unknown),
 * and the `[locale]` layout calls `setRequestLocale`. So for pages the locale
 * arrives as `requestLocale` and no cookie is read here, which keeps every page
 * shell static: prerendered once per language and served from the cache.
 *
 * Route handlers (`/api/download`) are outside `[locale]` and have no segment.
 * Only they reach the cookie branch, so their messages still follow the
 * teacher's language. That branch is dynamic, which is fine for a handler.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const segment = await requestLocale;
  const locale = isSupportedLocale(segment)
    ? segment
    : resolveRequestLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
