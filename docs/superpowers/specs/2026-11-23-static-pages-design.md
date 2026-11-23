# Static pages: per-language prerender behind a middleware rewrite

Date: 2026-11-23 · Status: draft, awaiting Miguel's approval

## Why

Vercel's Hobby Active CPU allowance is almost used up, and almost all of it is web-app.

Measured on 2026-11-23 (Hobby only shows the last 30 minutes):

- web-app used about 13 s of function CPU and about 4 s of middleware CPU in 30 quiet minutes.
- Within single minutes (11:43, 11:50), about 20 routes each ran once: `/calendar`, `/sources`, `/community`, `/checkout`, `/quiz`, `/test`, `/worksheet` and others. That is one page load prefetching every sidebar link (`SidebarLayout.tsx`) and the "Criar" menu (`CreateMenu.tsx`, `router.prefetch` on open).
- Each of those renders costs about 260–370 ms of CPU, so one full page load costs about 5–7 s, even with no clicks.

The root cause is `src/i18n/request.ts`, which reads the `NEXT_LOCALE` cookie. That one cookie read makes every page render on the server per request (ƒ) instead of being prerendered (○). Each render also serializes the full message bundle (about 190 KB, `messages/*.json`) through the root layout's `NextIntlClientProvider`. The middleware also mints a Clerk token for every request, prefetches included.

The server render does almost nothing useful. 47 of the 57 pages, including all 10 `[id]` document pages, are `"use client"` and fetch their data from chalkboard in the browser. The server only produces the shell and the loading skeleton.

Miguel's goal is lower CPU, and clicks that respond instantly. Clicks are the main pain today; the skeleton-to-content wait comes second.

## Goals

- Page shells are prerendered once per language at build time and served from Vercel's cache. Prefetches and navigations to them run no page function.
- Clicks between pages show the target page straight away, on desktop and on touch devices. Full-route prefetch from the cache makes this work.
- The middleware does less work per request: it reuses the backend token cookie while it is still valid.
- Behaviour users see stays the same: URLs, links, redirects, auth rules, the promo cookie, language choice and language switching.

## Non-goals

- Changing which components are client or server components. That's a later step, made possible by this one: under static rendering, UI that's the same for everyone can become a server component at no CPU cost.
- Speeding up skeleton to content, for example by caching data in the browser. That's separate follow-up work.
- Lazy-loading the heavy editors (tiptap, pptxgenjs, KaTeX). Also follow-up work.
- Upgrading the Vercel plan. That's Miguel's call, separate from this.

## Anti-goals (a failure even if it builds)

- Any page shows user data from the cache, or one teacher's content to another. Shells must stay free of user data.
- Locale URLs become visible (`/pt-PT/dashboard`), or existing links and bookmarks break.
- A Portuguese teacher sees English, or the other way round, including right after a language switch or on first visit from the landing page.
- Auth regressions: a protected page reachable signed out, or `/admin` or `/school` guards skipped.
- Phones get slower. Prefetch has to keep working without hover.

## Approaches considered

1. **Static pages, with a hidden `[locale]` segment and a middleware rewrite.** *Chosen.* Removes per-request page renders, makes clicks instant from the cache on every device, and keeps URLs. Costs: a large file move under `src/app/[locale]/`, and testing every route in both languages.
2. **Keep per-request rendering, with hover-only prefetch, smaller message payloads and token reuse.** Small change, and cuts CPU by maybe 70–80%. Clicks stay as they are on desktop and get slower on touch devices, which have no hover. That works against the goal, so this is a stopgap at most.
3. **Load translations in the browser and stop reading the cookie on the server.** Pages become static without moving folders. Dropped because English users would see Portuguese (or blank labels) on every first load.

Also discussed: splitting pages into smaller client pieces, with more server components. That doesn't fix CPU on its own, because pages would still render per request and do more work in each render. Under approach 1 it becomes the free next step.

## Design

### Routing

- Move every page route, with its layouts, `loading.tsx` and `error.tsx`, from `src/app/` to `src/app/[locale]/`. That covers `(main)`, `(checkout)`, `sign-in`, `sign-up`, `forgot-password`, `accept-organization-invitation`, `email`, `reengagement`, the root `layout.tsx` and `not-found.tsx`.
- **Stay outside `[locale]`:**
  - `src/app/api/**` (route handlers), `robots.ts`, `favicon.ico`, and anything served under `/.well-known`, `/webhooks`, `/_ph` and `/ingest`.
  - `src/app/global-error.tsx`. Next only picks it up from the root `app/` folder, and it has its own `<html>` and no translations.
- `src/app/[locale]/layout.tsx` becomes the root layout:
  - `generateStaticParams` returns one entry per locale in `locales`.
  - It reads `locale` from `params`, checks it with `hasLocale`, calls `notFound()` for unknown locales, and calls `setRequestLocale(locale)`.
  - **Don't set `dynamicParams = false`.** In Next 15.5 it applies to the whole route, not just one segment (`next/dist/build/static-paths/app.js`), so it would 404 every `[id]` and catch-all page. The middleware already makes sure only real locales arrive.
  - Its `generateMetadata` calls `getTranslations({ locale, namespace: "appMeta" })` with the locale from `params`. The `setRequestLocale` call in the layout body doesn't cover metadata.
- Any other layout or page that uses next-intl server APIs calls `setRequestLocale` too. Today that's `(checkout)/layout.tsx`.
- `(checkout)/checkout/loading.tsx` and `(checkout)/checkout/cancel/loading.tsx` are async server components that call `getTranslations`. Loading files get no `params`, so they become client components that use `useTranslations`.
- **`src/i18n/request.ts`:**
  - It uses next-intl's `requestLocale` (set from the segment) when that's defined and valid.
  - **When it's undefined, it falls back to today's cookie rule.** Only dynamic contexts reach that branch, and `/api/download` needs it: its DOCX labels and error messages (`getTranslations`, around lines 1973, 2640 and 2668) must keep following the teacher's language.
  - Pages under `[locale]` always have `requestLocale` set, so the cookie fallback never makes them dynamic. The build route table confirms this.
- `[id]` and catch-all pages are rendered on first request for each id, then cached. Their output doesn't depend on the id beyond the client reading it, so that's fine. The builder decides the exact mechanism: `generateStaticParams` returning `[]`, or an equivalent, as long as the build shows them as static or ISR and not ƒ.
- Pages that use `useSearchParams` (11 files) must sit inside a `Suspense` boundary for static prerendering. The build reports any that don't. Fix each one locally.
- Not-found handling has to keep working for unknown paths in both languages. The usual next-intl pattern is a minimal pass-through `src/app/layout.tsx`, plus `[locale]/not-found.tsx` and a `[locale]/[...rest]` page that calls `notFound()`. The builder settles the details.

### Middleware (`src/middleware.ts`)

- **Locale rewrite.** On page requests that reach the final `NextResponse.next()`:
  - Pick the locale from the `NEXT_LOCALE` cookie if it's in `locales`, otherwise `defaultLocale`. That's the same rule as today's `request.ts`. There's no Accept-Language detection: Portuguese teachers often use English browsers, and the landing page avoids that detection for the same reason.
  - Rewrite to `/${locale}${pathname}${search}`.
  - Existing redirects (`/` → dashboard or sign-in, auth pages → dashboard, trial activate, checkout sign-up, admin, school) stay redirects to the plain URLs. They don't get rewritten.
  - **My call:** a small custom rewrite rather than next-intl's `createMiddleware`. That keeps today's exact cookie rule and avoids layering another middleware into `clerkMiddleware`.
- **Never rewrite:** `/api/*`, `/webhooks/*`, `/trpc/*`, `/.well-known/*`, `/robots.txt`, `/sitemap.xml`, `/_ph/*`, `/ingest/*`, and anything already starting with a locale segment. A request for `/pt-PT/...` or `/en/...` typed directly gets redirected to the plain URL, so locale URLs never become a second public address.
- **Rewritten responses keep everything middleware sets today.** That means the promo cookie (`rememberPromo`) and the `scooli_token` cookie.
- **Token reuse.** In `setTokenCookie`, if the existing `scooli_token` cookie passes `cookieTokenForUser(token, authObj.userId)` (`src/lib/backendTokenCookie.ts`) with a larger safety margin (proposed: 20 s left before `exp`), keep it and skip `getToken`. Otherwise mint as today.
  - The builder confirms the JWT template's claims first. If the template carries organization claims, a token also has to be re-minted when its org differs from `authObj.orgId`, so an organization switch is never served a stale token.
  - The delete-on-signed-out and delete-on-failure behaviour stays as it is.

### Language switching

- `LocaleProvider` already writes the cookie and calls `router.refresh()` when the effective locale differs from the rendered one. After the change, that refresh goes back through middleware, gets rewritten to the other locale, and clears the client router cache.
- `renderedLocale` has to keep reflecting the locale the shell was built with (`useLocale()` from the provider).
- If testing shows `router.refresh()` serving the old language from any cache, fall back to `window.location.reload()` for that rare case.
- **Known behaviour change (accepted):** after a language change, the refresh returns a different `[locale]` value. Everything under the root layout remounts: the Redux store and the Clerk, Auth and Locale providers. So a language switch acts like a soft reload instead of keeping client state. The same happens once on first sign-in on a new device when the profile's language differs from the cookie, a moment after load. Check in testing that onboarding survives that remount, for example that a half-filled step isn't lost. If it doesn't, write the cookie before onboarding's first render.

### Prefetch

- Keep Next's default `<Link>` prefetch and the `CreateMenu` `router.prefetch`. Once pages are static they are cheap, and they are exactly what makes clicks instant.
- `staleTimes.dynamic: 60` in `next.config.ts` stays. It only matters for any route that is still dynamic.

## Constraints

- Next 15 App Router, next-intl 4, Clerk `clerkMiddleware`, `output: "standalone"`, Vercel Hobby.
- Locales and the cookie name come from `src/i18n/locales.ts`. They are shared with the landing page and chalkboard, so they don't change in this work.
- **Decided (Miguel, 2026-11-23):** this lands before the multi-country language-pack work (pt-PT, en-GB, pt-BR), on its own, with today's two locales (`pt-PT`, `en`). Everything reads the list from `locales.ts` (`generateStaticParams`, the middleware rule, `request.ts`), so adding a locale later is new entries, not new code. **Note for the language-pack work:** renaming `en` to `en-GB` needs a mapping in the middleware cookie rule, so existing `NEXT_LOCALE=en` cookies (including those the landing page sets) don't fall back to Portuguese.
- Shells must contain no user-specific data. Everything per teacher stays fetched in the browser after login.

## Verification

- `next build` route table: the 47 client pages show as ● (SSG) for both locales. The `[id]` pages are static or ISR, not ƒ. Route handlers stay ƒ.
- Lint and typecheck clean, and the existing vitest suite passes.
- On a local production build (`next build && next start`):
  - Click through every sidebar route and both create flows, signed in, in pt-PT and in en.
  - Switch the language in settings and check the whole UI flips, with no mixed languages.
  - Arrive from the landing page with `NEXT_LOCALE=en` set.
  - Sign in, sign up (including a `?promo=` link), forgot password, and an organization invitation.
  - Checkout and checkout cancel; `/admin` as a non-admin is redirected; `/school` as a non-admin member is redirected.
  - Open an unknown URL, a direct `/en/dashboard` (redirected to `/dashboard`), and a document `[id]` page for each document type.
  - The PDF/DOCX download (`/api/download`) still authenticates, and its labels and errors come out in English when the cookie is `en`.
- 6 device sizes, light and dark, using the existing headless sweep.
- After a preview or staging deploy, query `vercel metrics` over 30 minutes while using the app. Page routes should show close to zero function invocations per navigation, and middleware CPU per request should be lower than today's ~20 ms.

## Rollout

- One PR of its own, kept apart from the current uncommitted work on `develop`. Do it while no other big branch touches `src/app/` or `src/i18n/`, including the language-pack work, so the move doesn't turn into conflicts.
- Merge to `develop`, check staging with the metrics above, then `main` (production) as usual.

## Left to the builder

- The exact Suspense placement for the 11 `useSearchParams` pages.
- The not-found / catch-all structure.
- How `[id]` pages are made static or ISR.
- The exact token-reuse margin and claim checks, after reading the JWT template.
