import { defineConfig, devices } from '@playwright/test'

// End-to-end checks against the running stack (see e2e/README section in the root README):
// the backend in Docker (seeded) and the Vite dev server, which this config starts if needed.
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173'

const viewport = (width, height) => ({ viewport: { width, height } })

export default defineConfig({
  testDir: './e2e',
  // The journeys and the API check change shared data, so files run one at a time
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Layout checks run at the three widths of plan §16
    {
      name: 'mobile-375',
      testMatch: /layout\.spec\.js/,
      use: { ...devices['Desktop Chrome'], ...viewport(375, 812), isMobile: true, hasTouch: true },
    },
    {
      name: 'tablet-1024',
      testMatch: /layout\.spec\.js/,
      use: { ...devices['Desktop Chrome'], ...viewport(1024, 768) },
    },
    {
      name: 'desktop-1440',
      testMatch: /layout\.spec\.js/,
      use: { ...devices['Desktop Chrome'], ...viewport(1440, 900) },
    },
    // Journeys and the endpoint check once, on desktop
    {
      name: 'smoke',
      testMatch: /(journeys|api-coverage)\.spec\.js/,
      use: { ...devices['Desktop Chrome'], ...viewport(1440, 900) },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120000,
  },
})
