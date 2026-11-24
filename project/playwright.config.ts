import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8081',
    viewport: { width: 390, height: 844 },
    channel: 'msedge',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  // API local com banco em memória (o app web continua servido de dist/).
  webServer: {
    command: 'node server/index.mjs',
    url: 'http://127.0.0.1:4000/health',
    env: { NUTRIFOLIO_DB: ':memory:', PORT: '4000' },
    reuseExistingServer: !process.env.CI,
  },
});
