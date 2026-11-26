import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the demo build (synthetic data, no sign-in),
 * so they need no Fabric tenant and run the same locally and in CI.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4174',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } }, testMatch: /layout\.spec/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /layout\.spec/ },
  ],
  webServer: {
    command: 'npm run -w @rayfin-app/frontend build:demo && npm run -w @rayfin-app/frontend preview:demo',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
