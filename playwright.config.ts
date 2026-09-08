import { defineConfig, devices } from "@playwright/test";

/** E2E config — validates the two demo flows (patient journey, doctor pre-visit)
 * against the real app + seeded Neon data, with the deterministic MOCK AI
 * provider so chat/briefings don't depend on the live OpenAI API. */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1, // serial: avoids parallel Turbopack compile + shared-DB contention
  forbidOnly: !!process.env.CI,
  retries: 1, // tolerate Neon serverless cold-start hiccups
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Force the deterministic mock provider for E2E (overrides .env).
    env: { AI_PROVIDER: "mock" },
  },
});
