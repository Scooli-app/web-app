# Static Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prerender web-app's page shells once per language, and serve them from Vercel's cache behind a middleware rewrite. Prefetches and clicks then run no page function, and stay instant.

**Architecture:**
- All page routes move under a hidden `src/app/[locale]/` segment and get static params for each locale in `locales`.
- `src/middleware.ts` picks the locale from the `NEXT_LOCALE` cookie and rewrites `/x` to `/{locale}/x`, so public URLs don't change.
- `src/i18n/request.ts` takes the locale from the segment, falling back to the cookie only for route handlers.
- The middleware also reuses a still-valid `scooli_token` instead of minting one on every request.

**Tech Stack:** Next 15.5, next-intl 4.14, @clerk/nextjs 6.39, vitest, Playwright (e2e), Vercel Hobby.

**Spec:** `docs/superpowers/specs/2026-11-23-static-pages-design.md`. Read it before starting. Its "Design" section is binding.

## Global Constraints

- Locales and cookie name come only from `src/i18n/locales.ts`: `locales = ["pt-PT", "en"]`, `defaultLocale = "pt-PT"`, `LOCALE_COOKIE_NAME = "NEXT_LOCALE"`. Don't hardcode locale strings anywhere else.
- Locale rule: use the cookie value if `isSupportedLocale(value)`, otherwise `defaultLocale`. No Accept-Language detection.
- Public URLs never contain a locale. `/pt-PT/...` and `/en/...` typed directly get a redirect to the unprefixed path.
- Never rewrite: `/api`, `/trpc`, `/webhooks`, `/.well-known`, `/_ph`, `/ingest`, `/_next`, `/robots.txt`, `/sitemap.xml`. Match whole path segments, so `/apiary` is not `/api`.
- Do not set `dynamicParams = false` anywhere.
- `src/app/global-error.tsx`, `src/app/api/**` and `src/app/robots.ts` stay outside `[locale]`.
- Page shells must not contain user-specific data. No new server-side `auth()`, `cookies()` or `headers()` under `[locale]`.
- Work happens in its own worktree and branch. `develop` in the main checkout has unrelated uncommitted work, so don't touch it.
- At the end of each task: `npm run lint`, `npx tsc --noEmit` and `npm test` must pass (workspace CLAUDE.md).

## Review Focus

1. **Signed-out visit to a protected page** (`/dashboard` with no session) still redirects to `/sign-in`. The rewrite must happen after `auth.protect`, never instead of it. Pinned in Task 3, Step 9.
2. **A typed `/en/dashboard` or `/pt-PT/calendar`** redirects to `/dashboard` or `/calendar`, and is never served as a second URL. Pinned in Task 1 tests and Task 3, Step 9.
3. **The first visit from the landing page with `NEXT_LOCALE=en`** gets the English shell. A tampered cookie (`NEXT_LOCALE=fr`, `NEXT_LOCALE=EN`) gets Portuguese. Pinned in Task 1 tests and Task 3, Step 9.
4. **The query string survives the rewrite**: `?promo=` on sign-up, `?plan=` on checkout, `?invitation_id=` on invitations, `?token=` on email pages. Pinned in Task 1 tests and Task 3, Step 9.
5. **An organization switch or a different user in the same browser** always gets a freshly minted `scooli_token`, never the reused one. Pinned in Task 2 tests.

---

## Before Task 1: worktree

- [ ] Create the worktree from `origin/develop`, with `superpowers:using-git-worktrees`:
  ```bash
  cd /c/PROJECTS/Scooli/web-app && git fetch origin
  git worktree add ../web-app-static-pages -b perf/static-pages origin/develop
  ```
- [ ] Copy the spec and this plan into the worktree. Both are untracked in the main checkout.
  ```bash
  mkdir -p ../web-app-static-pages/docs/superpowers/{specs,plans}
  cp docs/superpowers/specs/2026-11-23-static-pages-design.md ../web-app-static-pages/docs/superpowers/specs/
  cp docs/superpowers/plans/2026-11-23-static-pages.md ../web-app-static-pages/docs/superpowers/plans/
  ```
- [ ] Copy the env files (`cp .env* ../web-app-static-pages/`), then `npm ci` in the worktree. Expected: installs cleanly.
- [ ] Baseline: run `npm test` and `npx next build` in the worktree. Save the route table (`build-before.txt`, not committed) to compare later. Expected: the build passes, and most pages show `ƒ`.
- [ ] Commit the docs: `git add docs/superpowers && git commit -m "docs: static pages design and plan"`.

All paths below are relative to the worktree.

---

### Task 1: Locale routing helpers

**Files:**
- Create: `src/i18n/localeRouting.ts`
- Modify: `src/i18n/locales.ts` (add `resolveRequestLocale`)
- Test: `src/i18n/localeRouting.test.ts`

**Interfaces:**
- Produces, in `src/i18n/locales.ts`:
  - `resolveRequestLocale(cookieValue: string | undefined): Locale`
- Produces, in `src/i18n/localeRouting.ts`:
  - `isLocaleRewritable(pathname: string): boolean`
  - `localePrefixOf(pathname: string): Locale | null`
  - `withLocalePrefix(pathname: string, locale: Locale): string`
  - `withoutLocalePrefix(pathname: string): string`

- [ ] **Step 1: Write the failing tests.** Use `describe` blocks per function in `src/i18n/localeRouting.test.ts`.
  - `resolveRequestLocale`:
    - `"en"` → `"en"`; `"pt-PT"` → `"pt-PT"`
    - `undefined` → `"pt-PT"`; `""` → `"pt-PT"`; `"fr"` → `"pt-PT"`; `"EN"` → `"pt-PT"`; `"pt"` → `"pt-PT"`
  - `isLocaleRewritable`:
    - true: `"/dashboard"`, `"/worksheet/abc-123"`, `"/sign-in/factor-one"`, `"/apiary"`, `"/"`
    - false: `"/api/download"`, `"/api"`, `"/trpc/x"`, `"/webhooks/stripe"`, `"/.well-known/assetlinks.json"`, `"/_ph/e"`, `"/ingest/decide"`, `"/_next/data/x"`, `"/robots.txt"`, `"/sitemap.xml"`, `"/en/dashboard"`, `"/pt-PT"`
  - `localePrefixOf`:
    - `"/en/dashboard"` → `"en"`; `"/pt-PT"` → `"pt-PT"`; `"/pt-PT/"` → `"pt-PT"`
    - `"/english"` → `null`; `"/dashboard"` → `null`; `"/"` → `null`
  - `withLocalePrefix`:
    - `("/dashboard", "en")` → `"/en/dashboard"`; `("/", "pt-PT")` → `"/pt-PT"`
  - `withoutLocalePrefix`:
    - `"/en/dashboard"` → `"/dashboard"`; `"/en"` → `"/"`; `"/pt-PT/calendar/mes"` → `"/calendar/mes"`; `"/dashboard"` → `"/dashboard"`

  Query strings aren't the helpers' job. Task 3 builds the URL with `req.nextUrl.clone()`, which keeps `search`.

- [ ] **Step 2: Run the tests.** `npx vitest run src/i18n/localeRouting.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement.**
  - `resolveRequestLocale` goes in `locales.ts`, next to `isSupportedLocale`.
  - The helpers go in `localeRouting.ts`. Base them on `locales` and a `NEVER_REWRITE` array of segment prefixes (from Global Constraints). Match a prefix as `pathname === p || pathname.startsWith(p + "/")`, except for the two file paths.
- [ ] **Step 4: Run the tests.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/i18n && git commit -m "feat(i18n): locale routing helpers for static pages"`

---

### Task 2: Reuse a still-valid backend token in middleware

**Files:**
- Modify: `src/lib/backendTokenCookie.ts`
- Modify: `src/middleware.ts` (`setTokenCookie`, around lines 72–100)
- Test: `src/lib/backendTokenCookie.test.ts`

**Interfaces:**
- Consumes: `getTokenSubject`, `getTokenExpiry` and `getTokenOrgId` from `src/lib/tokenSubject.ts` (existing).
- Produces: `reusableBackendToken(token: string | undefined, userId: string | null | undefined, orgId: string | null | undefined, now?: number): string | null` in `backendTokenCookie.ts`, plus `export const REUSE_MARGIN_MS = 20_000`.

- [ ] **Step 1: Check the token's claims.**
  - Production can set `CLERK_JWT_TEMPLATE`. Check its value with `vercel env ls` in `../web-app`, or in Clerk dashboard → JWT templates.
  - Decode a real `scooli_token` from a local signed-in session, from both a personal account and one with an active organization.
  - Confirm that `getTokenOrgId` returns the active org id (or `null` with no org) for both the default session token and the template, if one is set.
  - If the template has no org claim, note that in the commit message. The org check then compares `null` to `orgId`, and the cookie is re-minted whenever an org is active. That's safe, just less reuse.
- [ ] **Step 2: Write the failing tests.** Add `describe("reusableBackendToken")` to `backendTokenCookie.test.ts`, using the file's existing token builder:
  - keeps a token for the same user and same org, with 60 s left
  - keeps a token for the same user with no org on either side
  - **rejects a token whose org differs from `orgId`** (organization switch)
  - **rejects a token for another user**
  - rejects a token with 19 s left; keeps one with 21 s left (`REUSE_MARGIN_MS`)
  - rejects when `token` or `userId` is missing
- [ ] **Step 3: Run the tests.** `npx vitest run src/lib/backendTokenCookie.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 4: Implement `reusableBackendToken`.** It requires `exp`. A token with no `exp` isn't reused, unlike `cookieTokenForUser`.
- [ ] **Step 5: Wire it into `setTokenCookie`.** When `reusableBackendToken(req.cookies.get(TOKEN_COOKIE_NAME)?.value, authObj.userId, authObj.orgId)` returns a token, return without calling `getToken` and without re-setting the cookie. The signed-out delete and the delete on failure stay unchanged. Use `BACKEND_TOKEN_COOKIE` in place of the local `TOKEN_COOKIE_NAME` constant.
- [ ] **Step 6: Run the tests.** `npm test`. Expected: PASS.
- [ ] **Step 7: Commit.** `git commit -am "perf(middleware): reuse a still-valid scooli_token instead of minting per request"`

---

### Task 3: Move pages under `[locale]` and rewrite in middleware

**Files:**
- Move with `git mv` from `src/app/` into `src/app/[locale]/`: `(checkout)`, `(main)`, `accept-organization-invitation`, `email`, `forgot-password`, `reengagement`, `sign-in`, `sign-up`, `layout.tsx`, `not-found.tsx`, `globals.css`
- Stay put: `src/app/api/`, `src/app/global-error.tsx`, `src/app/robots.ts`, `src/app/favicon.ico`
- Create: `src/app/layout.tsx` (pass-through), `src/app/[locale]/[...rest]/page.tsx`
- Modify: `src/app/[locale]/layout.tsx`, `src/app/[locale]/(checkout)/layout.tsx`, `src/app/[locale]/(checkout)/checkout/loading.tsx`, `src/app/[locale]/(checkout)/checkout/cancel/loading.tsx`, `src/i18n/request.ts`, `src/middleware.ts`, and the two `@/app/email/...` imports (now `@/app/[locale]/email/...`)

**Interfaces:**
- Consumes: Task 1's `resolveRequestLocale`, `isLocaleRewritable`, `localePrefixOf`, `withLocalePrefix` and `withoutLocalePrefix`.
- Produces: the route tree that Task 4 makes static.

- [ ] **Step 1: Move the files** with `git mv` (one command per entry above), so git history follows them. Fix the two `@/app/email/emailCategory` imports. Commit the move by itself with nothing else changed (`git commit -m "refactor(app): move page routes under [locale]"`), so review can tell a move from an edit.
- [ ] **Step 2: Add the pass-through root layout.** `src/app/layout.tsx` is `export default function RootLayout({ children }: { children: React.ReactNode }) { return children; }`.
- [ ] **Step 3: Update `src/app/[locale]/layout.tsx`.**
  - Add `export function generateStaticParams()`, returning `locales.map((locale) => ({ locale }))`.
  - The component takes `params: Promise<{ locale: string }>`. It calls `notFound()` unless `isSupportedLocale(locale)`, then `setRequestLocale(locale)`, and uses `locale` for `<html lang>`. Remove `getLocale()`.
  - `generateMetadata({ params })` calls `getTranslations({ locale, namespace: "appMeta" })`.
  - Keep the `./globals.css` and KaTeX imports.
- [ ] **Step 4: Update `(checkout)/layout.tsx`.** It takes `params: Promise<{ locale: string }>`, calls `setRequestLocale(locale)` before `getTranslations`, and has no other changes.
- [ ] **Step 5: Convert both checkout `loading.tsx` files to client components.** Use `"use client"` and `useTranslations("checkout")`, with the same JSX and keys.
- [ ] **Step 6: Update `src/i18n/request.ts`.** Use `getRequestConfig(async ({ requestLocale }) => …)`:
  ```ts
  const segment = await requestLocale;
  const locale = isSupportedLocale(segment)
    ? segment
    : resolveRequestLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
  ```
  Messages load as today. Replace the "Cost, measured" comment: say that pages get the locale from the segment and stay static, and that only route handlers such as `/api/download` reach the cookie branch.
- [ ] **Step 7: Add `src/app/[locale]/[...rest]/page.tsx`**, a server component that only calls `notFound()`. `not-found.tsx` now lives in `[locale]` and renders inside the locale layout.
- [ ] **Step 8: Update the middleware.**
  - At the top of the handler, after the `/webhooks/stripe` early return: if `localePrefixOf(pathname)` is not null, redirect (307) to `withoutLocalePrefix(pathname)` with the same `search`.
  - At the final return, replace `NextResponse.next()`:
    - If `isLocaleRewritable(pathname)`, clone `req.nextUrl`, set `pathname = withLocalePrefix(pathname, resolveRequestLocale(req.cookies.get(LOCALE_COOKIE_NAME)?.value))`, and return `NextResponse.rewrite(url)`.
    - Otherwise return `NextResponse.next()`.
  - Either way, still pass the response through `rememberPromo` and `setTokenCookie`.
  - All earlier redirects stay exactly as they are.
- [ ] **Step 9: Verify against a local production build.** Run `npx next build && npx next start`. The build may fail on `useSearchParams` Suspense errors. If it does, do Task 4 Steps 1–3 first, then come back. With `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n"`:
  - `/dashboard`, signed out → `307 …/sign-in` (Review Focus 1)
  - `/en/dashboard` → `307 …/dashboard`; `/pt-PT/calendar?x=1` → `307 …/calendar?x=1` (Review Focus 2)
  - `/sign-in` with `-H "Cookie: NEXT_LOCALE=en"` → `200`, and the HTML has `lang="en"`. With `NEXT_LOCALE=fr` and `NEXT_LOCALE=EN`, the HTML has `lang="pt-PT"`. (Review Focus 3)
  - `/sign-up?promo=TEST1` → the `Set-Cookie` header contains the trial promo cookie. `/email/unsubscribe?token=abc` → `200`. (Review Focus 4)
  - `/does-not-exist` → `404`, with the app's not-found page in the cookie's language.
  - `/robots.txt` → `200`. `/api/download` without auth → the same status as on `develop` today.
  - Signed in with Playwright, check `/dashboard`, `/documents`, `/calendar`, `/settings`, `/checkout?plan=monthly` (the plan param is read), and one `/worksheet/<id>`. All render, and the language matches the cookie.
- [ ] **Step 10: Run lint, typecheck and tests.** `npm run lint && npx tsc --noEmit && npm test`. Expected: all pass.
- [ ] **Step 11: Commit.** `git commit -am "feat(app): serve pages from a hidden [locale] segment via middleware rewrite"`

---

### Task 4: Make every page shell static

**Files:**
- Modify: any of the 11 `useSearchParams` pages that the build reports. Each needs a `<Suspense>` around the component that reads `useSearchParams`. The fallback is that route's existing `loading.tsx` component where there is one.
- Create: a `layout.tsx` beside each dynamic segment, exporting `generateStaticParams() { return []; }` and returning `children`. The dynamic segments are:
  - `[id]` under `admin/feedback`, `calendar`, `curriculum-plan`, `lesson-plan`, `presentation`, `quiz`, `test`, `worksheet`
  - `[userId]` under `admin/costs`
  - `[[...sign-in]]`, `[[...sign-up]]`, `[[...forgot-password]]`, `[[...rest]]` (accept-organization-invitation)

**Interfaces:**
- Consumes: Task 3's route tree.

- [ ] **Step 1: Run `npx next build`.** Save the output. Expected, before fixes: Suspense errors for some `useSearchParams` pages, or a passing build that lists the dynamic routes as `ƒ`.
- [ ] **Step 2: Wrap each reported page in `<Suspense>`.** Rebuild after each batch.
- [ ] **Step 3: Add the `generateStaticParams` layouts** for the dynamic segments above. If a segment still shows `ƒ`, use `export const dynamic = "force-static"` in that layout instead, and say why in a one-line comment.
- [ ] **Step 4: Check the route table.**
  - Every page under `/[locale]` shows `●` (SSG), with `/pt-PT/...` and `/en/...` listed.
  - Dynamic segments show `●` with ISR on demand, not `ƒ`.
  - Only `/api/*` and the `/[locale]/[...rest]` not-found catch-all stay `ƒ`. The catch-all is only hit by unknown URLs.
  - Save it as `build-after.txt` and diff against `build-before.txt` from the baseline.
- [ ] **Step 5: Check no shell picked up user data.** Grep the prerendered HTML under `.next/server/app/` for `user_` and `@`. Expected: no Clerk user ids or emails.
- [ ] **Step 6: Run lint, typecheck and tests.** `npm run lint && npx tsc --noEmit && npm test`. Expected: all pass.
- [ ] **Step 7: Commit.** `git commit -am "perf(app): prerender page shells (Suspense for search params, static params for dynamic segments)"`

---

### Task 5: Language switch, first sign-in, and the download route

**Files:**
- Modify only if a check fails: `src/components/providers/LocaleProvider.tsx`

- [ ] **Step 1: Check the language switch.** On the production build, signed in, change the language in settings (pt-PT → en → pt-PT).
  - Expected: the whole UI flips, with no mixed languages.
  - A soft remount is acceptable (the spec's "Known behaviour change").
  - If the old language persists, change the `router.refresh()` call to `window.location.reload()`, and note why in a comment.
- [ ] **Step 2: Check first sign-in on a fresh browser profile.** Use an account whose profile language is `en`, with no `NEXT_LOCALE` cookie.
  - Expected: the UI ends up in English.
  - Onboarding doesn't lose a half-filled step. If it does, write the cookie before onboarding's first render, then re-check.
- [ ] **Step 3: Check `/api/download`.** With `NEXT_LOCALE=en`, export a DOCX on a free account and on a Pro account. Expected: the DOCX labels, and the "DOCX is Pro only" error, are in English. With `pt-PT`, they're in Portuguese.
- [ ] **Step 4: Run lint, typecheck and tests**, then commit any change: `git commit -am "fix(i18n): …"`. If nothing changed, write "no change needed" in the PR body.

---

### Task 6: Full verification, deploy check, PR

- [ ] **Step 1: Run the e2e suite** against the local production build (`E2E_BASE_URL=http://localhost:3000 npx playwright test`). Expected: same pass/fail as on `develop`. Record any test that was already failing before.
- [ ] **Step 2: Click through every sidebar route and both create flows** in pt-PT and in en. Then sign in, sign up with `?promo=`, forgot password, an organization invitation, checkout and checkout cancel, `/admin` as a non-admin (redirected), and `/school` as a non-admin member (redirected).
- [ ] **Step 3: Run the existing headless responsive sweep** (6 sizes, light and dark) on `/dashboard`, `/documents`, `/calendar`, `/settings` and one editor page. Expected: no layout changes against `develop`.
- [ ] **Step 4: Push the branch and open a PR to `develop`.** Use `--base develop`, a body summarising the spec, the route-table diff, and the Task 5 results, and end it with the attribution line. Then bind the PR with the ccd_pr tools.
- [ ] **Step 5: Check the preview deploy.**
  - Use the app for about 10 minutes, then query, with `--scope team_Xx5gFkDYej5fSDsYFlLr4Y6S`:
    - `vercel metrics vercel.function_invocation.count -p web-app --since 29m --group-by route`
    - the same for `vercel.middleware_invocation.function_cpu_time_ms --aggregation avg`
  - Expected:
    - Page routes show close to zero invocations per click, against about 20 per page load before.
    - Average middleware CPU is below today's ~20 ms.
  - Put the numbers in the PR body.
