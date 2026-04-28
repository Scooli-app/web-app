# AGENTS.md

This file provides guidance to coding agents when working in this repository.

## Mandatory Context Bootstrap

Before starting any task in this repository, read `../scooli-context.md` (repo-level product context file) and use it as the source of truth for:
- what Scooli is,
- product goals,
- how the platform works,
- key domain terminology.

If implementation details here conflict with product intent in `../scooli-context.md`, flag the conflict and ask for clarification before making assumptions.

## Repository Snapshot

Scooli Web App is the frontend repository for Scooli.

- Framework/runtime: Next.js 15 (App Router), React 19, TypeScript (strict)
- Styling/UI: Tailwind CSS v4, tw-animate-css, shadcn/ui-style primitives, Lucide icons
- Auth: Clerk (`@clerk/nextjs`) + middleware-managed backend token cookie
- State management: Redux Toolkit (domain slices under `src/store`)
- Rich editor: TipTap + custom diff/suggestions extension
- API integration: Axios client + domain services in `src/services/api/*`
- Backend dependency: Scooli Chalkboard API (Quarkus, `../chalkboard`)

Primary architecture direction:
- `app` routes and page composition
- `components` feature UI and interaction logic
- `services/api` backend contract layer
- `store` global state, async thunks, selectors
- `shared/types` cross-feature contracts and enums

## Local Development Commands

From repository root (`web-app`):

```bash
npm run dev      # Next.js dev server (Turbopack)
npm run serve    # alias to dev
npm run build    # production build
npm run start    # run production server
npm run lint     # Next/ESLint checks
```

Docker helper flow:

```bash
make dev         # build image + run dev container on :3000
make dev-rebuild # no-cache rebuild + dev
make docker-shell
make clean
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend expected by default: `http://localhost:8080` (via `NEXT_PUBLIC_BASE_API_URL`)

## Code Organization

### `src/app`

App Router with route groups:

- `(main)` (authenticated workspace):
  - `/dashboard`
  - `/documents`
  - `/lesson-plan`, `/lesson-plan/[id]`
  - `/test`, `/test/[id]`
  - `/quiz`, `/quiz/[id]`
  - `/presentation`, `/presentation/[id]`
  - `/community`, `/community/dashboard`
  - `/settings`
  - `/support`
  - `/admin`, `/admin/features`, `/admin/moderation`, `/admin/feedback`, `/admin/feedback/[id]`
- `(checkout)`:
  - `/checkout`
  - `/checkout/cancel`
- Auth pages:
  - `/sign-in`
  - `/sign-up`
  - `/forgot-password` (currently redirects to `/sign-in`)
- App API route:
  - `/api/download` (PDF/DOCX export generation)

### `src/components`

Feature-first UI organization:
- `document-creation/`: creation form, grade/subject/method selectors, template browser/creator
- `document-editor/`: editor shell, title editing, AI chat panel, share/export actions
- `editor/`: diff engine + TipTap extension/tooling for suggestions mode
- `community/`: discovery grid, share modal, contributor dashboard, moderation queue
- `feedback/`: support forms/history (user side)
- `admin/`: admin cards and feedback-related UI
- `layout/`: sidebar layout, nav, usage indicator
- `providers/`: Store, Theme, Clerk theme, Auth token bridge
- `ui/`: reusable primitives + app-level UI widgets

### `src/services`

- `api/client.ts`: central axios instance and interceptors
- `api/*.service.ts`: domain API wrappers (documents, templates, subscriptions, assistant, community, moderation, feedback, admin feedback, features, health)
- `download/documentDownload.ts`: calls `/api/download` and handles browser download

### `src/store`

Redux root plus domain slices:
- `documents`
- `subscription`
- `assistant`
- `community`
- `moderation`
- `admin-feedback`
- `features`
- `ui`

### `src/shared`

- `types/`: source of truth for frontend contracts (`DocumentType`, API params/responses, routes, feature flags, subscriptions, feedback)
- `config/constants.ts`: shared constants (`AUTO_SAVE_DELAY`, title limits)
- `utils/`: markdown conversion/sanitization and common helpers

## Authentication, Middleware, and Session Flow

Main auth behavior is in `src/middleware.ts`:

- Uses Clerk middleware and route matcher.
- Public routes include:
  - `/sign-in(.*)`, `/sign-up(.*)`, `/forgot-password(.*)`, `/signup`, `/`, `/checkout/cancel`, `/webhooks/stripe`, `/.well-known/(.*)`.
- Redirects `/` to `/dashboard`.
- Protects non-public routes via `auth.protect(...)`.
- Admin route guard:
  - path starts with `/admin`
  - requires `sessionClaims.public_metadata.role === "admin"`
- Sets/refreshes `scooli_token` HTTP-only cookie (15 minutes) using `CLERK_JWT_TEMPLATE` if available.

Token wiring:
- `AuthProvider` sets token getter in API client via `setApiTokenGetter`.
- API client fetches fresh Clerk token per request and sends `Authorization: Bearer <token>`.

## Providers and Runtime Composition

Root layout (`src/app/layout.tsx`) wraps app in:
1. `StoreProvider`
2. `ThemeProvider`
3. `ClerkThemeProvider`
4. `AuthProvider`

Also includes:
- `Toaster`
- `@vercel/analytics`
- `@vercel/speed-insights`
- early theme init script to avoid dark/light flash

Main workspace layout (`SidebarLayout`) adds:
- navigation shell
- usage indicator
- upgrade modal
- floating assistant provider

## API Client and Data Contracts

`src/services/api/client.ts` behavior:

- `baseURL = NEXT_PUBLIC_BASE_API_URL`
- default JSON headers + `withCredentials: true`
- request interceptor injects Clerk bearer token
- response retry path for 401 (single retry after 500ms)
- 402 handler dispatches `setUpgradeModalOpen(true)` globally
- non-JSON response guard to catch wrong API base URLs or HTML fallback responses

Pagination convention:
- Backend uses 0-based page index.
- UI uses 1-based index.
- Conversion happens in `document.service.ts`.

## Implemented Domains and Flows

### Documents (Create, Stream, Edit, Chat)

Core files:
- `src/components/document-creation/DocumentCreationPage.tsx`
- `src/components/document-editor/DocumentEditor.tsx`
- `src/services/api/document.service.ts`
- `src/store/documents/documentSlice.ts`

Flow:
1. User fills document creation form (topic, subject, year, template, optional method/details).
2. `createDocument` thunk hits `POST /documents`.
3. App navigates to `/<doc-type>/<id>`.
4. Editor connects to SSE stream URL via `streamDocumentContent(...)`.
5. Stream events handled:
   - `content`
   - `title`
   - `sources`
   - `done`
   - `error`
6. Generated content is loaded into TipTap editor and persisted via autosave/update API.

Editor + AI chat:
- AI updates can enter "suggestions mode" (diff overlay) instead of immediate overwrite.
- Per-change accept/reject and bulk accept/reject are provided by custom TipTap extension.
- Standard chat path uses `POST /documents/{id}/chat`.

### Templates

Core files:
- `src/services/api/template.service.ts`
- `src/components/document-creation/templates/*`

Capabilities:
- list templates by document type (`GET /templates?documentType=...`)
- create/update/delete templates
- set default template (`PUT /templates/{id}/default`)
- system + custom template handling in one browser modal

### Document Library and Import

Core files:
- `src/components/ui/documents-gallery.tsx`
- `src/components/modals/upload-document-modal.tsx`

Capabilities:
- document listing with type filters and infinite scroll
- selection mode + single/bulk delete
- import flow:
  1. get presigned upload URL (`GET /documents/upload-url`)
  2. direct file upload to storage
  3. trigger import (`POST /documents/import`)
  4. poll document status until completed (`waitForDocument`)

### Assistant (Global Floating Chat)

Core files:
- `src/components/assistant/*`
- `src/store/assistant/assistantSlice.ts`
- `src/services/api/assistant.service.ts`

Capabilities:
- floating assistant button and panel available across workspace layout
- SSE streaming to `POST /assistant/chat/stream`
- message history persisted in Redux slice
- usage refresh after completion

### Subscription and Checkout

Core files:
- `src/services/api/subscription.service.ts`
- `src/app/(checkout)/checkout/page.tsx`
- `src/app/(main)/settings/page.tsx`
- `src/components/ui/upgrade-plan-modal.tsx`

Capabilities:
- plans/current/usage display
- checkout session creation (`POST /subscriptions/checkout`)
- billing portal session (`POST /subscriptions/portal`)
- cancel endpoint wrapper (`POST /subscriptions/cancel`)
- upgrade prompt from 402 errors or explicit user actions

### Community Library and Moderation

Core files:
- `src/services/api/community.service.ts`
- `src/store/community/*`
- `src/store/moderation/*`
- `src/app/(main)/community/*`
- `src/app/(main)/admin/moderation/page.tsx`

Capabilities:
- discover resources with filters/pagination
- reuse resource and track reused IDs
- share resource modal from editor
- contributor dashboard (personal impact stats)
- admin moderation queue and moderation actions

### Feedback (User and Admin)

User side:
- `src/components/feedback/*`
- `src/services/api/feedback.service.ts`
- `src/app/(main)/support/page.tsx`

Admin side:
- `src/services/api/admin-feedback.service.ts`
- `src/store/admin-feedback/adminFeedbackSlice.ts`
- `src/app/(main)/admin/feedback/*`

Capabilities:
- submit bug/suggestion with image attachments (`/uploads` + `/feedback`)
- user feedback history (`/feedback/me`)
- admin filtering, detail, status/severity update, notes, and responses (`/admin/feedback/*`)

### Feature Flags

Core files:
- `src/shared/types/featureFlags.ts`
- `src/store/features/featuresSlice.ts`
- `src/services/api/features.service.ts`
- `src/app/(main)/admin/features/page.tsx`

Current typed flags:
- `community_library`
- `document_review`

### Export/Download

Core files:
- `src/app/api/download/route.ts`
- `src/services/download/documentDownload.ts`

Capabilities:
- converts markdown content to:
  - PDF (`pdf-lib`)
  - DOCX (`docx`)

## Backend API Surface Used by Frontend (Quick Map)

- `/documents`
- `/documents/stats`
- `/documents/{id}`
- `/documents/{id}/chat`
- `/documents/upload-url`
- `/documents/import`
- `/templates`
- `/templates/{id}`
- `/templates/{id}/default`
- `/assistant/chat/stream`
- `/subscriptions/plans`
- `/subscriptions/current`
- `/subscriptions/usage`
- `/subscriptions/checkout`
- `/subscriptions/portal`
- `/subscriptions/cancel`
- `/community/resources`
- `/community/resources/{id}`
- `/community/resources/mine`
- `/community/resources/{id}/reuse`
- `/community/resources/reused-ids`
- `/community/analytics/dashboard`
- `/community/stats`
- `/admin/moderation/queue`
- `/admin/moderation/action`
- `/features`
- `/admin/features`
- `/admin/features/{key}`
- `/feedback`
- `/feedback/me`
- `/uploads`
- `/admin/feedback`
- `/admin/feedback/{id}`
- `/admin/feedback/{id}/notes`
- `/admin/feedback/{id}/respond`
- `/health`

## Configuration and Environment

Primary env vars used in this repo:

- `NEXT_PUBLIC_BASE_API_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_JWT_TEMPLATE` (frontend token getter)
- `CLERK_JWT_TEMPLATE` (middleware token cookie template)
- `AUTH_COOKIE_DOMAIN` (optional cookie domain override)
- `VERCEL_AUTOMATION_BYPASS_SECRET` (optional deployment automation)

Important config files:
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `tailwind.config.js`
- `src/app/globals.css`

## Engineering Conventions

- Use `@/*` import alias.
- Keep API calls in `src/services/api/*`, not scattered across components.
- Keep shared contracts in `src/shared/types/*`.
- Prefer `Routes` enum for navigation paths.
- Maintain document type values as camelCase strings (`lessonPlan`, `test`, `quiz`, `presentation`).
- Preserve SSE event contract (`type`, `data`) and existing streaming behavior.
- Keep backend pagination translation logic (0-based backend, 1-based UI).
- For global state, add domain slices/selectors instead of local prop-drilling for shared concerns.
- Use existing UI primitives and design tokens (`bg-card`, `text-foreground`, `border-border`, etc.).

## Known Caveats and Gaps

1. Document status mismatch risk.
- Frontend still checks for status `"error"` in some import/stream code paths.
- Backend domain also uses `"failed"` status in multiple places; keep both repos aligned when changing status enums.

2. `fetchDocument` thunk calls `setPendingInitialPrompt(...)` without dispatch.
- This action creator call currently has no state effect.

3. `useInitialPrompt` appears stale.
- It contains duplicated effect logic.
- It calls `/api/documents/{id}/chat`, but this app only defines `/api/download`.

4. Tests are not wired as an active workflow.
- No test script/config is present in `package.json`, but a legacy test file exists at `src/components/admin/__tests__/StatusCard.test.tsx`.
- That test file does not match current component/service shape.

5. Document search in gallery is client-side over loaded pages.
- `DocumentsGallery` filters `documents` in memory and does not send search query to backend fetch.
- Search results may be partial until all pages are loaded.

6. Community moderation preview renders HTML with `dangerouslySetInnerHTML`.
- Assumes backend-provided content is safe/sanitized.

7. Admin feature flags page uses inline API types.
- `src/app/(main)/admin/features/page.tsx` bypasses a dedicated typed service layer and performs direct `apiClient` calls.

8. Upload modal uses hard reload after successful import.
- `UploadDocumentModal` eventually calls `window.location.reload()` instead of state-first refresh.

9. `updateEmails` npm script path is repository-coupled.
- Script points to `chalkboard/services/...` path and may fail if working directory layout changes.

## When Adding Features

Use these checklists:

1. New page/route
- Add route under `src/app` with correct route group.
- Update `Routes` enum if route is navigable/shared.
- Update sidebar nav and role/feature gating where needed.
- Confirm middleware access behavior (public/protected/admin).

2. New backend integration
- Add/extend typed service in `src/services/api`.
- Add/extend shared types in `src/shared/types`.
- Handle auth, pagination, and error mapping through `apiClient`.

3. New global state domain
- Create Redux slice + selectors under `src/store/<domain>`.
- Register reducer in `rootReducer.ts`.
- Export typed selectors/actions from domain index file if needed.

4. New document capability (generation/chat/editor)
- Keep existing SSE contract and streaming callbacks compatible.
- Preserve diff/suggestions mode behavior when applying AI edits.
- Update `documentTypes` mapping and route mapping if adding a new user-facing document type.

5. New feature flag
- Add key to `FeatureFlag` enum.
- Fetch/evaluate from backend `/features`.
- Gate UI behavior in components and nav (not frontend-only assumptions).

6. New support/admin workflow
- Keep user API (`/feedback`) and admin API (`/admin/feedback`) contracts separated.
- Reuse existing status/severity enums and badge mapping patterns.

