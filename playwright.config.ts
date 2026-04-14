import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'set NODE_ENV=test&& npm run build && npm start',
    port: 3001,
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      PORT: '3001',
      NODE_ENV: 'test',
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
    },
  },
});
