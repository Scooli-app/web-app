import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Signs the dedicated test user in on this page and waits until the app has finished setting the
 * account up (it activates the user's organisation on first load). With E2E_CLERK_USER_PASSWORD it
 * uses the password; without it, a Clerk sign-in ticket (needs CLERK_SECRET_KEY, in .env.local).
 *
 * Every test signs in fresh rather than reusing a saved session: a saved Clerk session cookie
 * expires after a minute, and the org activation on load then posts with it and gets bounced to
 * /sign-in.
 */
export async function signIn(page: Page): Promise<void> {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("Set E2E_CLERK_USER_EMAIL in .env.e2e.local (see README → Testes e2e).");
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.loaded({ page });
  if (password) {
    await clerk.signIn({ page, signInParams: { strategy: "password", identifier: email, password } });
  } else {
    await clerk.signIn({ page, emailAddress: email });
  }
  // <SignIn> sends the now signed-in user to the dashboard itself: wait for that rather than
  // navigating over it (its redirect could otherwise land in the middle of the test).
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "A preparar a tua conta" })).toBeHidden({ timeout: 90_000 });
  // The organisation switch (if any) has settled once the active org matches a membership.
  await page.waitForFunction(
    () => {
      const c = window.Clerk;
      if (!c?.loaded || !c.user) return false;
      return c.user.organizationMemberships.length === 0 || !!c.organization;
    },
    undefined,
    { timeout: 30_000 },
  );
}
