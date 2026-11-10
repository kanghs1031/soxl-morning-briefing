import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'v3-ui.spec.mjs', timeout: 30000,
  fullyParallel: false, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    { name: 'webkit', use: { ...devices['iPhone 13'] } }
  ],
  webServer: { command: 'node scripts/serve-v3.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
