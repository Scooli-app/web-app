import { expect, test } from "@playwright/test";

/**
 * Signed out, the middleware's locale rewrite must never stand in for the auth
 * check. Asserted on the server's response: the client-side Clerk redirect would
 * still land on /sign-in and hide a missing server check.
 */
for (const path of ["/dashboard", "/settings", "/worksheet/00000000-0000-4000-8000-000000000000", "/en/dashboard"]) {
  test(`signed out, ${path} is redirected to sign-in by the server`, async ({ request }) => {
    let response = await request.get(path, { maxRedirects: 0 });
    // A typed locale URL first goes to its plain URL, which then needs sign-in.
    if (path.startsWith("/en/")) {
      expect(response.status()).toBe(307);
      expect(response.headers().location).toMatch(/\/dashboard$/);
      response = await request.get(response.headers().location, { maxRedirects: 0 });
    }
    expect(response.status(), path).toBe(307);
    expect(response.headers().location, path).toMatch(/\/sign-in(\?|$)/);
  });
}
