import { defineConfig, devices } from "@playwright/test"

// E2E resets the database before every test, so it must never point at real data.
const databaseUrl = process.env["E2E_DATABASE_URL"]
const jwtSecret = process.env["E2E_JWT_SECRET"]
if (databaseUrl === undefined || jwtSecret === undefined) {
  throw new Error("Set E2E_DATABASE_URL (a disposable Postgres database) and E2E_JWT_SECRET. `make e2e` does both.")
}
process.env["DATABASE_URL"] = databaseUrl // read by @lib/db inside the test process (fixtures)
process.env["JWT_SECRET"] = jwtSecret // lets fixtures mint expired or forged tokens

const PORT = 3100
const CI = process.env["CI"] !== undefined

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // one shared database
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 240_000,
    env: { DATABASE_URL: databaseUrl, JWT_SECRET: jwtSecret },
  },
})
