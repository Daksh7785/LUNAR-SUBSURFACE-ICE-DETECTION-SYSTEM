import { defineConfig, devices } from '@playwright/test';

/**
 * Enterprise-Grade Playwright Configuration for ISRO LUPEX Web Portal.
 * Configured for comprehensive cross-browser compatibility, mobile responsiveness,
 * and automated visual regression checks.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:80',
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure cross-browser & mobile testing matrix */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Android (Pixel 7)',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile iPhone 15 Pro',
      use: { ...devices['iPhone 15 Pro'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'docker-compose up --build',
  //   url: 'http://localhost:80',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
