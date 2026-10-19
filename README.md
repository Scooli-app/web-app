This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testes e2e (Playwright)

End-to-end tests in `e2e/` drive a real browser through the main teacher flows: the dashboard week card, the lesson pop-up, the create form opened from a lesson, and "Os meus documentos" grouped by turma. They run against the local web-app and chalkboard API, signed in as a dedicated Clerk test user.

**One-time setup**

1. In the Clerk **dev** instance, create a test user (never a real account), e.g. `e2e+clerk_test@scooli.app`.
2. Create `web-app/.env.e2e.local` (gitignored):

   ```bash
   E2E_CLERK_USER_EMAIL=e2e+clerk_test@scooli.app
   # Optional: without a password, sign-in uses a Clerk sign-in ticket (needs CLERK_SECRET_KEY from .env.local)
   E2E_CLERK_USER_PASSWORD=...
   ```

3. Add `NEXT_PUBLIC_CLERK_KEYLESS_DISABLED=1` to `web-app/.env.local` (see `.env.example`). Without it, a Clerk dev-only server action on every page load sometimes sends a fresh test session to `/sign-in`.
4. Install the browser: `npx playwright install chromium`.

**Running**

1. Start chalkboard with fake AI (no OpenAI calls, no credits spent): `make dev-e2e` in `chalkboard/`. This is `make dev` with `CHALKBOARD_AI_FAKE=true`, which swaps in `FakeAiClient` and `FakeEmbeddingService` (fixed content). It is a build-time switch, so production builds never contain them.
2. Start the web-app: `npm run dev`.
3. Run `npm run test:e2e` (or `npm run test:e2e:ui` to watch and debug). The report is in `playwright-report/`.

**What the tests do to your data**

- A setup step runs once per run: if the test user isn't Pro yet (Pro through an organisation counts), it gets a local Pro subscription in the `scooli-db` container (no Stripe), so free-plan limits and credits never block a run. It also completes onboarding through the API, so the welcome flow never covers the page.
- Each test signs in fresh through Clerk's testing helpers, no saved sessions.
- Each test creates its own turmas through the API, titled `[e2e] …`, and deletes them with their documents before and after it runs. Nothing else is touched.
- Tests run one at a time because they share the test user's dashboard.

**CI**: `.github/workflows/ci.yml` runs `Unit tests` (vitest) and `E2E tests` on every PR to `develop` or `main`; both must pass to merge into `main`. The E2E job builds chalkboard from its `main` (or the `CHALKBOARD_REF` repo variable) with fake AI, runs it against a Postgres service container, builds and starts the web-app, then runs Playwright. It needs four repository secrets: `CHALKBOARD_READ_TOKEN` (read-only access to the private chalkboard repo), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (Clerk dev instance), and `E2E_CLERK_USER_EMAIL`. On failure, the Playwright report and server logs are uploaded as artifacts.

**Other URLs**: `E2E_BASE_URL` (default `http://localhost:3000`), `E2E_API_URL` (default `http://127.0.0.1:8080`) and `E2E_DB_CONTAINER` (default `scooli-db`). The web-app must point at the same API through `NEXT_PUBLIC_BASE_API_URL`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
