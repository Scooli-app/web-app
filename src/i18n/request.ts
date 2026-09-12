import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isSupportedLocale, LOCALE_COOKIE_NAME } from "./locales";

/**
 * Resolves the request locale from the `NEXT_LOCALE` cookie.
 *
 * There is no `[locale]` route segment in this app — see `src/i18n/README` note in
 * `locales.ts`: create.scooli.app sits entirely behind auth, so locale-prefixed
 * URLs would buy nothing and cost a rewrite of every route and every `Link`.
 * The cookie is written by `LocaleProvider` on the client and handed over from
 * the landing page, which uses the same cookie name.
 *
 * Anything unrecognised falls back to `pt-PT`, so a missing or tampered cookie
 * leaves today's Portuguese behaviour exactly as it is.
 *
 * ── Cost, measured ──
 * Reading a cookie here is a dynamic API, so every page under the root layout
 * moves from statically prerendered (○) to server-rendered on demand (ƒ). That
 * was verified against a build with this read removed: `/dashboard`,
 * `/documents` and `/settings` flip back to ○ without it.
 *
 * Accepted, because the pages in question are auth-gated skeletons that fetch
 * everything they show, and `clerkMiddleware` already runs an `auth()` and mints
 * a token on every one of these requests. If that cost ever stops being
 * acceptable, the fix is locale route segments (`/[locale]/...`), which can be
 * prerendered per language — not a cleverer cookie.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isSupportedLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
