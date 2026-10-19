import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

// Clerk keys come from .env.local (same as the dev server); the test user from .env.e2e.local.
for (const file of [".env.e2e.local", ".env.local"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * End-to-end tests: a real browser against the running web-app (default :3000) and chalkboard API
 * (default :8080, started with `make dev-e2e` so AI calls are faked). See README → "Testes e2e".
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  globalSetup: "./e2e/clerk.global-setup.ts",
  // The tests share one test user and the dashboard shows all of its turmas: run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
