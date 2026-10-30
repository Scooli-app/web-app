import { expect, test as setup } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Api } from "./support/api";
import { signIn } from "./support/auth";

/**
 * Once per run: make sure the test user is Pro, has finished onboarding and has no leftover e2e
 * turmas. Each test then signs in on its own (see support/auth.ts).
 */
setup("prepare the test user (Pro, onboarding done, no old data)", async ({ page, request }) => {
  // A cold dev server compiles every page on first visit: give the setup room.
  setup.setTimeout(180_000);
  await signIn(page);

  const api = new Api(page, request);
  const limits = await api.call<{ isPro: boolean }>("GET", "/users/me/plan-limits"); // also creates the user row
  const clerkUserId = await page.evaluate(() => window.Clerk.user?.id ?? "");
  if (!/^user_[A-Za-z0-9]+$/.test(clerkUserId)) throw new Error(`Unexpected Clerk user id: ${clerkUserId}`);
  if (!limits.isPro) {
    grantPro(clerkUserId);
    expect((await api.call<{ isPro: boolean }>("GET", "/users/me/plan-limits")).isPro).toBe(true);
  }
  enableWorksheets(clerkUserId);

  await completeOnboarding(api);
  await api.cleanup();
});

/**
 * A new user gets the full-screen welcome flow on every page until it's finished: answer it once
 * through the API (a 2.º ano Matemática teacher, no school, no class) so it never covers the tests.
 */
async function completeOnboarding(api: Api): Promise<void> {
  const status = await api.call<{ mode: "full" | "profile" | "none" }>("GET", "/onboarding/v2/status");
  if (status.mode === "none") return;
  await api.call("POST", "/onboarding/v2/profile", {
    schoolName: null,
    noSchool: true,
    teacherRole: "teacher",
    schoolYears: [2],
    items: [{ qualificationCode: null, kind: "subject", code: "matematica", label: "Mathematics", trainingComponent: null }],
  });
  if (status.mode === "full") {
    await api.call("POST", "/onboarding/v2/complete", {
      planningDay: 7,
      weeklyEmail: false,
      goals: [],
      acquisitionSource: null,
      acquisitionSourceOther: null,
      skippedClass: true,
      prepHoursPerWeek: null,
      currentTools: [],
      classCount: null,
    });
  }
  expect((await api.call<{ mode: string }>("GET", "/onboarding/v2/status")).mode).toBe("none");
}

/**
 * Gives the test user a local Pro subscription (no Stripe), so the free plan's one-turma limit,
 * its 4-week window and credits never get in the way. Database only: there is no API for it.
 */
function grantPro(clerkUserId: string): void {
  runSql(`
    INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, interactions_limit, metadata)
    SELECT u.id, p.id, 'active', now() - interval '1 day', now() + interval '10 years', 100000, '{"source":"e2e"}'::jsonb
    FROM users u, subscription_plans p
    WHERE u.clerk_user_id = '${clerkUserId}' AND p.plan_code = 'pro_monthly_promo'
      AND NOT EXISTS (
        SELECT 1 FROM user_subscriptions s
        WHERE s.user_id = u.id AND s.status IN ('active', 'trialing', 'past_due'));`);
}

/**
 * The worksheet buttons (and their API) sit behind `worksheet_creation`, which migrations seed off and
 * production has on. Turn it on for the test user only, so a fresh CI database behaves like production.
 */
function enableWorksheets(clerkUserId: string): void {
  runSql(`
    INSERT INTO feature_flag_overrides (feature_flag_id, user_id, enabled)
    SELECT f.id, u.id, TRUE FROM feature_flags f, users u
    WHERE f.key = 'worksheet_creation' AND u.clerk_user_id = '${clerkUserId}'
    ON CONFLICT (feature_flag_id, user_id) DO UPDATE SET enabled = TRUE;`);
}

function runSql(sql: string): void {
  // CI: a Postgres reachable by URL (psql on the runner). Locally: the scooli-db Docker container.
  const databaseUrl = process.env.E2E_DATABASE_URL;
  const psql = databaseUrl
    ? ["psql", databaseUrl]
    : ["docker", "exec", process.env.E2E_DB_CONTAINER ?? "scooli-db", "psql", "-U", "scooli", "-d", "scooli"];
  execFileSync(psql[0], [...psql.slice(1), "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: "pipe" });
}
