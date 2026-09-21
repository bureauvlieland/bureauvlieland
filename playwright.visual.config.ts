import { defineConfig } from "@playwright/test";

/**
 * Visuele regressietest van het ontwerpsysteem (fase 5, borging): elke
 * publieke paginasoort op desktop en telefoon, vergeleken met een
 * vastgelegde referentie in tests/e2e/visual/__snapshots__. Draait in CI
 * tegen de preview-build (`bunx vite build --mode preview`, zodat /ontwerp
 * bestaat). Zie tests/e2e/visual/README.md.
 */
const PORT = 4173;

export default defineConfig({
  testDir: "./tests/e2e/visual",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  outputDir: "test-results/visual",
  // Zonder platformachtervoegsel: de referenties zijn gemaakt met dezelfde
  // Chromium (de headless shell van deze Playwright-versie) op Linux als in CI.
  snapshotPathTemplate: "{testDir}/__snapshots__/{arg}-{projectName}{ext}",
  timeout: 120_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide", scale: "css" },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    deviceScaleFactor: 1,
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    trace: "retain-on-failure",
    // Alleen bij het opnemen van fixtures (UPDATE_FIXTURES=1) gaat er echt
    // verkeer naar Supabase; een sandbox achter een onderscheppende proxy
    // heeft dan een eigen certificaat. Bij het vergelijken is dit zonder effect.
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: `bunx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
