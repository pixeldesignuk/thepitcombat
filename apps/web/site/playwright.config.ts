import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4322',
    headless: true,
    reducedMotion: 'reduce',
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } : {}),
  },
  webServer: {
    command: 'node scripts/browser-stack.mjs',
    url: 'http://127.0.0.1:4322/healthz',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
