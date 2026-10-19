import { test as base } from "@playwright/test";
import { Api } from "./api";
import { signIn } from "./auth";

/**
 * Every test starts signed in as the test user, on the dashboard. `api` is the chalkboard API as
 * that user, for seeding; each test starts and ends with no e2e turmas, so the week card only
 * ever shows what that test created.
 */
export const test = base.extend<{ api: Api }>({
  page: async ({ page }, provide) => {
    await signIn(page);
    await provide(page);
  },
  api: async ({ page, request }, provide) => {
    const api = new Api(page, request);
    await api.cleanup();
    await provide(api);
    await api.cleanup();
  },
});

export { expect } from "@playwright/test";
