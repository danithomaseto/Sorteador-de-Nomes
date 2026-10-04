import { defineConfig, devices } from "@playwright/test";

// Localmente é possível usar um Chromium já instalado (PLAYWRIGHT_CHROMIUM_PATH); no CI o
// Playwright baixa o navegador correspondente à versão.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const launchOptions = executablePath ? { executablePath } : {};

// Com E2E_BASE_URL os testes rodam contra um ambiente já no ar (ex.: o docker compose); sem ela,
// sobem a API e a prévia do build localmente.
const externalBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseURL ?? "http://127.0.0.1:4173",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, launchOptions },
    },
    {
      name: "celular",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"], launchOptions },
    },
  ],
  webServer: externalBaseURL
    ? []
    : [
        {
          command: "uv run uvicorn app.main:app --host 127.0.0.1 --port 8100",
          cwd: "../backend",
          url: "http://127.0.0.1:8100/api/health",
          env: { APP_ENV: "test", APP_RATE_LIMIT_ENABLED: "false", APP_LOG_LEVEL: "WARNING" },
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "node ../frontend/scripts/serve.mjs",
          url: "http://127.0.0.1:4173/",
          env: { API_TARGET: "http://127.0.0.1:8100" },
          reuseExistingServer: !process.env.CI,
        },
      ],
});
