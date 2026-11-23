import { expect, test } from "./support/fixtures";
import { signIn } from "./support/auth";

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

// Every route with an id renders on its first request instead of at build time,
// so the build guard can't check it: a server-side dynamic call there would be a
// 500 for teachers. The shell renders before any data loads, so any id will do.
const ID_ROUTES = [
  "/lesson-plan/ID",
  "/worksheet/ID",
  "/quiz/ID",
  "/test/ID",
  "/presentation/ID",
  "/presentation/ID/present",
  "/curriculum-plan/ID",
  "/calendar/ID",
];

for (const locale of ["pt-PT", "en"] as const) {
  test(`every document page shell renders for an unseen id, in ${locale}`, async ({ page }) => {
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: locale, url: page.url() }]);
    for (const route of ID_ROUTES) {
      const path = route.replace("ID", crypto.randomUUID());
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      expect(await response?.text(), path).toContain(`<html lang="${locale}"`);
    }
  });
}

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

test("switching the language swaps the whole interface and survives a reload", async ({ page }) => {
  const sidebar = page.locator("[data-sidebar=sidebar]").first();
  const switchTo = async (current: RegExp, label: string) => {
    await page.getByRole("button", { name: current }).click();
    await page.getByRole("menuitem", { name: label }).click();
  };
  try {
    await page.goto("/dashboard");
    await switchTo(/Alterar idioma|Change language/, "English");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(sidebar.getByText("Documents", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(sidebar.getByText("Documents", { exact: true })).toBeVisible();
  } finally {
    // The test user is shared: leave it in Portuguese.
    await switchTo(/Alterar idioma|Change language/, "Português");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-PT");
    await expect(sidebar.getByText("Documentos", { exact: true })).toBeVisible();
  }
});

test("a fresh browser picks up the profile's language after sign-in", async ({ page, browser }) => {
  const toggle = /Alterar idioma|Change language/;
  await page.goto("/dashboard");
  await page.getByRole("button", { name: toggle }).click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // A new device: no NEXT_LOCALE cookie, so the first shell is Portuguese.
  const fresh = await (await browser.newContext()).newPage();
  try {
    await signIn(fresh);
    await expect(fresh.locator("html")).toHaveAttribute("lang", "en", { timeout: 30_000 });
    await expect(fresh.locator("[data-sidebar=sidebar]").first().getByText("Documents", { exact: true })).toBeVisible();
  } finally {
    await fresh.context().close();
    await page.getByRole("button", { name: toggle }).click();
    await page.getByRole("menuitem", { name: "Português" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-PT");
  }
});
