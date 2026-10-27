import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1920, height: 1080 },
    timezoneId: 'UTC',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run build -- --outDir dist-e2e && npm run preview -- --outDir dist-e2e --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    env: {
      VITE_SYMLINK_NAME: 'e2e-bundle',
      VITE_MACHINE_CLIENT_API: 'http://127.0.0.1:4174/machine',
      VITE_NETWORK_CHECK_URL: 'http://127.0.0.1:4174/connectivity',
      VITE_POLL_TIMEOUT_SECONDS: '5',
      VITE_CORE_VERSION: 'e2e',
      VITE_DAILY_RELOAD_TIME: 'off',
    },
  },
});
