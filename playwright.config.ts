import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'https://fixlab-app.web.app',
    headless: true,
    viewport: { width: 1400, height: 900 },
    actionTimeout: 15000,
  },
  reporter: [['list']],
})
