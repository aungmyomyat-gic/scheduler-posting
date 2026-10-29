import { defineConfig, devices } from "@playwright/test";
import { z } from "zod";

const portSchema = z.coerce.number().int().min(1024).max(65535);
const webPort = portSchema.parse(process.env.E2E_WEB_PORT ?? 3100);
const apiPort = portSchema.parse(process.env.E2E_API_PORT ?? 4100);
const frontendOrigin = `http://localhost:${webPort}`;
const apiBaseUrl = `http://localhost:${apiPort}/api/v1`;
process.env.E2E_API_BASE_URL = apiBaseUrl;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "pnpm --dir ../backend exec tsx src/server.ts",
      url: `${apiBaseUrl}/health`,
      env: { PORT: String(apiPort), FRONTEND_ORIGIN: frontendOrigin },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm dev --hostname 127.0.0.1 --port ${webPort}`,
      url: frontendOrigin,
      env: { NEXT_PUBLIC_API_BASE_URL: apiBaseUrl },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
