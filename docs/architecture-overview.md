# Web App Architecture Overview

Last reviewed: 2026-03-31

## 1. What `web-app` is

`web-app` is Scooli's main product frontend.

It is not just a set of pages over raw backend calls. It contains:

- the authenticated application shell
- the full document creation and editing experience
- subscription and feature-gating UX
- community library and admin surfaces
- a lightweight server layer inside Next.js for export/download and middleware

At a high level, it is:

- a Next.js 15 App Router application
- React 19 + TypeScript
- Redux Toolkit for client application state
- Clerk for authentication
- Tailwind + shadcn/Radix primitives for UI
- Axios-based service modules for backend communication
- PostHog + Vercel Analytics/Speed Insights for telemetry

## 2. Top-level repository layout

The repo is organized around the Next.js app plus a few supporting runtime/build files:

```text
web-app/
  public/                 Static assets and manifest files
  src/
    app/                  App Router routes, layouts, middleware-facing pages, API routes
    components/           Feature components, layout shell, providers, shared UI primitives
    hooks/                Reusable client hooks
    services/             API and download services
    shared/               Shared types, config, and utilities
    store/                Redux store, slices, selectors, hooks
    lib/                  Small runtime helpers
    assets/               App-local icons/components
  next.config.ts          Next.js runtime/build config
  instrumentation-client.ts
  tailwind.config.js
  components.json
  package.json
  Dockerfile
  Makefile
```

This structure reflects four main concerns:

1. routing and page composition
2. reusable UI and feature workflows
3. data/state integration
4. frontend runtime infrastructure

## 3. Architectural shape

The app is organized more like:

```text
app shell + feature components + state/services + shared contracts
```

than like a strict MVC structure.

A useful way to read it is:

```text
app/            route composition and layout boundaries
components/     feature workflows and reusable UI
store/          client-side state and async orchestration
services/       backend and export integration
shared/         contracts, constants, and utilities
```

This is the dominant structural separation in the project.

## 4. Main directories and responsibilities

### 4.1 `src/app`

Purpose:

- define route groups and page entrypoints
- define layout boundaries
- host Next.js-native middleware/API behavior

The route tree is grouped intentionally:

```text
src/app/
  (main)/         authenticated app shell
  (checkout)/     checkout/subscription flow shell
  (print)/        reserved route group, currently empty
  api/            Next.js server routes
  sign-in/        auth routes
  sign-up/
  forgot-password/
  layout.tsx      global root layout
```

Key idea:

- most `page.tsx` files are thin entrypoints
- real feature logic usually lives in `components/`

Examples:

- creation pages such as `lesson-plan/page.tsx` and `presentation/page.tsx` just render a shared `DocumentCreationPage`
- editor pages such as `lesson-plan/[id]/page.tsx` dynamically import the shared `DocumentEditor`
- `src/app/api/download/route.ts` is a server-side route for document export

### 4.2 `src/components`

Purpose:

- hold the real UI implementation
- separate feature workflows from route files
- provide a shared design-system layer

This directory is split into:

- feature areas:
  `document-creation`, `document-editor`, `assistant`, `community`, `feedback`, `admin`, `auth`
- app shell:
  `layout`, `providers`, `modals`
- editor infrastructure:
  `editor`
- UI primitives:
  `ui`

This is where most of the frontend complexity actually lives.

The pattern is strong and consistent:

- routes are thin
- feature components are thick
- shared UI primitives are centralized

### 4.3 `src/store`

Purpose:

- own client-side app state
- coordinate async requests through slices/thunks
- hold cross-page UI state

Current slices are feature-oriented:

- `documents`
- `subscription`
- `features`
- `assistant`
- `community`
- `moderation`
- `admin-feedback`
- `ui`

This is not a normalized data cache in the React Query sense. It is an application-state store:

- document/editor state
- subscription and usage state
- feature flags
- assistant panel state
- modal/theme/UI state

The store is injected into the API client so response interceptors can trigger UI behavior, such as opening the upgrade modal on HTTP `402`.

### 4.4 `src/services`

Purpose:

- isolate backend communication and some app-side integration logic

There are two main service groups:

- `services/api/*`
- `services/download/*`

`services/api/*` contains typed modules such as:

- `document.service.ts`
- `subscription.service.ts`
- `community.service.ts`
- `features.service.ts`
- `assistant.service.ts`

These wrap the Chalkboard backend endpoints and keep transport logic out of components.

`services/download/documentDownload.ts` is slightly different:

- it talks to the local Next route `/api/download`
- that route then performs export generation server-side

### 4.5 `src/shared`

Purpose:

- provide contracts and utilities shared across the app

This includes:

- `shared/types/*`
- `shared/config/*`
- `shared/utils/*`

This is the project's contract layer.

It is especially important because:

- the frontend mirrors many backend DTOs/types directly
- route constants are centralized
- markdown/document utilities are reused across flows

### 4.6 `src/hooks`

Purpose:

- extract reusable client behavior from large components

Important examples:

- `useDocumentManager`
- `useAutoSave`
- `useEditorAnalytics`
- `useAdmin`
- `useUnsavedChanges`

These hooks are mostly workflow hooks, not just small convenience utilities.

## 5. Layout and route-group organization

### 5.1 Root layout

`src/app/layout.tsx` is the global composition root.

It sets up:

- metadata and favicons
- global font/theme initialization
- Redux provider
- theme provider
- Clerk provider/theme wrapper
- auth-to-API token bridge
- toaster
- Vercel analytics and speed insights

This is the main application runtime shell.

### 5.2 `(main)` route group

`src/app/(main)/layout.tsx` wraps the authenticated product area in `SidebarLayout`.

This group contains the primary app experience:

- dashboard
- document lists
- document creation routes
- document editor routes
- community
- settings
- support
- admin pages

### 5.3 `(checkout)` route group

`src/app/(checkout)/layout.tsx` provides a simplified shell for purchase/subscription flows.

This separation is useful because checkout pages intentionally do not use the full main app shell.

### 5.4 auth routes

`sign-in`, `sign-up`, and `forgot-password` are separated from the main app shell and handled through Clerk.

### 5.5 `api`

The frontend repo includes a small but important Next server layer.

The main example is:

- `src/app/api/download/route.ts`

This route:

- runs on the Node runtime
- checks auth/subscription context
- generates PDF/DOCX output
- captures analytics

So the repo is not purely client-rendered; it includes targeted server-side application behavior.

## 6. Request and state flow

A typical product flow looks like this:

```text
route page
  -> feature component
  -> Redux thunk or local hook
  -> services/api client
  -> Chalkboard backend
  -> Redux state update
  -> feature component re-renders
```

For the core document-creation path, that becomes:

```text
src/app/(main)/lesson-plan/page.tsx
  -> components/document-creation/DocumentCreationPage
  -> store/documents/createDocument thunk
  -> services/api/document.service.ts
  -> backend /documents endpoint
  -> stream metadata stored in Redux
  -> editor route push
  -> components/document-editor/DocumentEditor
  -> SSE stream connection
  -> editor and side chat hydrate progressively
```

This tells us something important about the architecture:

- route pages are intentionally small
- Redux and service modules are the orchestration layer
- feature components own the workflow UX

## 7. Authentication and bootstrap architecture

### 7.1 Clerk as auth provider

Authentication is built around Clerk:

- middleware protection via `src/middleware.ts`
- provider setup in `ClerkThemeProvider`
- token acquisition via Clerk hooks

### 7.2 Middleware responsibilities

`src/middleware.ts` handles:

- public vs protected route checks
- redirecting `/` to `/dashboard`
- redirecting signed-in users away from auth pages
- admin route protection based on Clerk metadata
- refreshing a backend-facing auth cookie

That makes middleware the first security and navigation gate in the app.

### 7.3 Auth-to-API bridge

`AuthProvider` does a key piece of integration work:

- it exposes a Clerk token getter to the shared Axios client
- that lets every API request attach a fresh bearer token

This is a clean separation:

- Clerk auth state stays in Clerk
- transport auth stays in the API client
- feature code just calls services

### 7.4 App bootstrap gate

`AppBootstrapGate` is the authenticated app initialization layer.

After auth resolves, it loads:

- subscription
- usage
- feature flags

before the main app becomes interactive.

This is a strong architectural pattern in the repo because it centralizes startup state instead of scattering that logic across pages.

## 8. State management organization

Redux is used as the app-wide workflow store.

### What Redux owns well here

- document/editor lifecycle
- assistant UI state
- upgrade modal and theme state
- subscription and usage counters
- feature flags
- community/admin data that spans multiple screens

### What Redux is not doing

- it is not acting like a normalized backend mirror of everything
- it is not replacing all component state
- local UI state still stays inside components when it is truly local

This gives the app a practical split:

- global workflow and cross-page state in Redux
- local form/editor state in hooks/components

## 9. Service layer organization

The service layer is centered around a shared Axios client:

- `services/api/client.ts`

That client provides:

- base URL and JSON setup
- Clerk token injection
- 401 retry behavior during auth restoration races
- centralized response/error handling
- a global `402` hook into the upgrade modal

This is one of the most important infrastructure files in the app because it standardizes backend communication.

Each feature then builds on top of it with typed modules.

### Examples

`document.service.ts`

- list/fetch/update documents
- create documents
- connect to SSE stream
- import uploaded files

`community.service.ts`

- resource discovery
- sharing
- reuse
- moderation

`subscription.service.ts`

- current plan
- checkout/portal flows
- usage stats

## 10. Shared contracts and backend alignment

`src/shared/types` is an important architectural layer.

It contains the frontend-side contracts for:

- documents
- subscriptions
- feedback
- templates
- community
- routes
- generic API request/response shapes

This means the app is strongly contract-driven.

It also implies a form of coupling:

- frontend types closely follow backend DTOs
- backend changes can propagate into frontend service/state code quickly

That is efficient, but it also means the boundary between frontend model and backend schema is relatively thin.

## 11. Feature architecture

### 11.1 Document creation

Where it lives:

- route entrypoints in `src/app/(main)/*/page.tsx`
- shared creation workflow in `components/document-creation`
- async orchestration in `store/documents/documentSlice.ts`
- backend transport in `services/api/document.service.ts`

Key pattern:

- all document types reuse one configurable creation experience
- document-specific behavior is mostly configuration, not separate page logic

This is one of the cleanest patterns in the codebase.

### 11.2 Document editor

Where it lives:

- editor routes in `src/app/(main)/*/[id]/page.tsx`
- shared editor in `components/document-editor/DocumentEditor.tsx`
- editor support in `components/editor/*`
- sync/autosave hooks in `hooks/*`
- document state in `store/documents/*`

Important characteristics:

- editor pages dynamically import the heavy editor component with `ssr: false`
- the editor is a rich client-only workflow
- it integrates autosave, streaming, AI chat, diff/suggestion review, image upload, and export

This is the highest-complexity area of the frontend.

### 11.3 Assistant

Where it lives:

- `components/assistant/*`
- `store/assistant/*`
- related API service module

The assistant is mounted globally via `AssistantProvider` inside the main shell, which makes it a cross-cutting app capability rather than a page-specific widget.

### 11.4 Community and moderation

Where it lives:

- `app/(main)/community/*`
- `components/community/*`
- `store/community/*`
- `store/moderation/*`
- `services/api/community.service.ts`

This is a good example of a vertically organized feature:

- routes
- UI
- state
- transport

all line up around the same domain.

### 11.5 Subscription and feature gating

Where it lives:

- `store/subscription/*`
- `store/features/*`
- `components/ui/upgrade-plan-modal.tsx`
- feature checks inside shell and page components

This is a real architectural layer, not just incidental logic.

It affects:

- navigation visibility
- upgrade prompts
- generation hints
- premium export behavior
- early-access route availability

### 11.6 Admin

Where it lives:

- `app/(main)/admin/*`
- `components/admin/*`
- `store/admin-feedback/*`
- `store/moderation/*`

Admin access is enforced in middleware and then surfaced through dedicated admin pages/components.

## 12. UI system and styling architecture

The UI layer is structured around:

- Tailwind
- shadcn/Radix primitives
- centralized CSS variables
- app-specific feature components over those primitives

### Infrastructure pieces

- `components.json` shows shadcn-style setup
- `components/ui/*` contains reusable primitives
- `globals.css` defines theme tokens and global component/editor styling
- `tailwind.config.js` extends the design system

This creates a three-level UI stack:

1. raw primitives and utility classes
2. reusable app primitives in `components/ui`
3. product workflows in feature components

That separation is healthy and mostly consistent.

## 13. Client/server boundary inside the frontend repo

This repo includes both client-heavy UI and selected server-side logic.

### Mostly client-driven areas

- document creation/editing
- Redux state
- assistant interactions
- community/admin screens
- theme and modal state

### Server-side areas

- middleware
- `/api/download`
- server-side PostHog client helper

The app therefore uses Next.js as both:

- a frontend application framework
- a light server runtime for edge/server concerns that are better kept close to the UI

## 14. Analytics and observability

There are several telemetry layers:

- PostHog browser init in `instrumentation-client.ts`
- PostHog server helper in `src/lib/posthog-server.ts`
- Vercel Analytics and Speed Insights in the root layout
- event capture inside feature workflows such as document creation, chat, reuse, and downloads

This means analytics is not hidden in one place only. It is partly infrastructural and partly embedded inside workflow components.

## 15. Testing organization

Testing is currently light.

Current shape:

- only a very small number of component tests appear to exist
- one explicit example is `src/components/admin/__tests__/StatusCard.test.tsx`

What that implies:

- most architecture is enforced by convention and runtime behavior rather than a broad automated test suite
- feature complexity is concentrated in places that currently have limited dedicated test coverage

## 16. Separation of concerns: what is clean and what is mixed

### Clean separations

The codebase has several good boundaries:

- route composition in `app`
- feature workflows in `components`
- transport logic in `services`
- app-wide workflow state in `store`
- contracts/utilities in `shared`
- auth and app bootstrap centralized at the shell level

### Mixed or pragmatic boundaries

There are also some intentionally pragmatic overlaps:

- Redux thunks and service modules together form the orchestration layer rather than having a separate domain/use-case layer
- components such as `DocumentEditor` are very large and coordinate multiple concerns
- shared types closely mirror backend contracts, which keeps development fast but increases coupling
- analytics calls are sprinkled in feature code as well as infrastructure files

These are not necessarily mistakes, but they are the main places where complexity accumulates.

## 17. Current architectural characteristics

### Strengths

- Route pages are thin and reusable flows live in shared feature components.
- The app shell is clearly separated from feature screens.
- Global startup concerns are centralized in the root providers and bootstrap gate.
- Service modules keep backend access out of components.
- The UI system has a recognizable base layer instead of ad hoc styling everywhere.
- Feature slices such as community and document creation are easy to locate.

### Coupling hotspots

- `DocumentEditor.tsx` is a major orchestration hub for streaming, editing, chat, diffing, images, and export.
- The document feature touches almost every architectural layer: routes, components, hooks, Redux, services, shared types, and server export.
- The API client knows about UI behavior through the injected store dispatch, which is practical but couples transport and app-state layers.

### In-progress or uneven areas

- `presentation` is already represented across routes, types, sidebar navigation, and creation/editor flows, but it still appears to ride the generic document pipeline rather than a fully distinct frontend feature architecture.
- Some feature availability is intentionally partial and gated by flags, such as worksheet/presentation navigation and community resource-type exposure.
- The `(print)` route group exists but is currently unused.

## 18. Practical guide: where new code should go

Based on the existing architecture:

- new page or route boundary:
  `src/app`
- new feature workflow UI:
  `src/components/<feature>`
- new cross-page or global workflow state:
  `src/store/<feature>`
- new backend integration:
  `src/services/api`
- new frontend-only integration like export/download:
  `src/services/download` or `src/app/api`
- new shared contract/config/helper:
  `src/shared`
- new reusable hook:
  `src/hooks`
- new UI primitive:
  `src/components/ui`

When possible, prefer extending an existing feature slice instead of creating broad generic folders or utilities.

## 19. Short summary

`web-app` is a feature-oriented Next.js frontend with a clear shell:

- `app` defines routes and layout groups
- `components` implements the product workflows
- `store` owns app-wide workflow state
- `services` owns transport and export integration
- `shared` holds contracts, routes, config, and utilities

The architecture is strongest where it keeps route files thin and pushes real behavior into shared feature components and typed service/state layers. The main complexity pressure is concentrated in the document editor and document-generation flows, which act as the core engine of the product UI.
