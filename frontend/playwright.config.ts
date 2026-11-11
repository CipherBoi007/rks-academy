import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks against a running stack: the backend on the dev profile (demo data, date pinned to
 * 2026-11-05) and `npm run build && npm start` on :3000. Some tests record data, so run them against a
 * freshly seeded database.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./e2e/.results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  // E2E_CHANNEL=msedge (or chrome) uses an installed browser instead of `npx playwright install chromium`.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined } }],
});
