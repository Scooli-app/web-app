import { expect, test } from "./support/fixtures";

/**
 * Pages are prerendered once per language under a hidden [locale] segment and the
 * middleware rewrites /x to /{locale}/x from the NEXT_LOCALE cookie. These checks
 * cover what a signed-in teacher would notice if that broke.
 */
const SIDEBAR_ROUTES = [
  "/dashboard",
  "/documents",
  "/calendar",
  "/calendar/planos-letivos",
  "/curriculum-plan",
  "/sources",
  "/community",
  "/support",
  "/settings",
  "/lesson-plan",
  "/worksheet",
  "/presentation",
  "/quiz",
  "/test",
];

for (const locale of ["pt-PT", "en"] as const) {
  test(`every sidebar page loads signed in, in ${locale}, at its plain URL`, async ({ page }) => {
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: locale, url: page.url() }]);
    for (const route of SIDEBAR_ROUTES) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      expect(new URL(page.url()).pathname, route).toBe(route);
      // The served shell is the copy for the cookie's language.
      expect(await response?.text(), route).toContain(`<html lang="${locale}"`);
    }
  });
}

test("a typed locale URL redirects to the plain one and keeps the query", async ({ page }) => {
  await page.goto("/en/checkout?plan=monthly");
  await expect(page).toHaveURL(/\/checkout\?plan=monthly$/);
});

test("a document page renders for an id never seen at build time", async ({ page, api }) => {
  const id = await api.createLessonPlan("static shell");
  try {
    const response = await page.goto(`/lesson-plan/${id}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText("404");
  } finally {
    await api.deleteDocument(id);
  }
});
