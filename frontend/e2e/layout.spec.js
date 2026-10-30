// Q-01 / Q-02: every screen at 375, 1024 and 1440 px (one Playwright project each).
// Checks: no serious accessibility violations (axe), one h1, no sideways page scroll.
// Full-page screenshots are attached to the report for the visual review.

import { test, expect } from '@playwright/test'

import {
  adminCredentials,
  call,
  expectAccessible,
  expectNoHorizontalScroll,
  removeUser,
  signInByApi,
  signUpByApi,
  useToken,
} from './support'

let user
let admin
let carId

test.beforeAll(async ({ request }) => {
  user = await signUpByApi(request)
  admin = await signInByApi(request, adminCredentials())
  const { body } = await call(request, 'GET', '/cars', { token: user.token })
  carId = body.data[0]?._id
})

test.afterAll(async ({ request }) => {
  await removeUser(request, admin?.token, user?.user._id)
})

const check = async (page, testInfo, name) => {
  await expect(page.locator('h1')).toHaveCount(1)
  await expectAccessible(page, testInfo)
  await expectNoHorizontalScroll(page)
  const path = testInfo.outputPath(`${name}.png`)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

test('auth', async ({ page }, testInfo) => {
  await page.goto('/auth')
  await expect(page.getByRole('tab', { name: 'Sign In' })).toBeVisible()
  await check(page, testInfo, 'auth-signin')

  await page.goto('/auth?mode=signup')
  await expect(page.getByLabel('Confirm password')).toBeVisible()
  await check(page, testInfo, 'auth-register')
})

test.describe('signed in as a user', () => {
  test.beforeEach(async ({ page }) => {
    await useToken(page, user.token)
  })

  test('fleet', async ({ page }, testInfo) => {
    await page.goto('/fleet')
    await expect(page.getByRole('heading', { name: 'Carshes Fleet' })).toBeVisible()
    await expect(page.locator('article').first()).toBeVisible()
    await check(page, testInfo, 'fleet')
  })

  test('fleet with the map and filters open', async ({ page }, testInfo) => {
    await page.goto('/fleet?map=1&available=0')
    await expect(page.locator('#fleet-map .leaflet-container')).toBeVisible()
    await check(page, testInfo, 'fleet-map')
  })

  test('car details', async ({ page }, testInfo) => {
    test.skip(!carId, 'the fleet is empty: seed the cars first')
    await page.goto(`/cars/${carId}`)
    await expect(page.getByRole('heading', { name: 'Book this car' })).toBeVisible()
    await check(page, testInfo, 'car-details')
  })

  test('my trips', async ({ page }, testInfo) => {
    await page.goto('/trips')
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible()
    await check(page, testInfo, 'my-trips')
  })

  test('my profile', async ({ page }, testInfo) => {
    await page.goto('/profile')
    await expect(page.getByText(user.email).first()).toBeVisible()
    await check(page, testInfo, 'my-profile')
  })

  test('not found', async ({ page }, testInfo) => {
    await page.goto('/no-such-page')
    await expect(page.getByText('Page not found')).toBeVisible()
    await expectAccessible(page, testInfo)
    await expectNoHorizontalScroll(page)
  })
})

test.describe('signed in as an admin', () => {
  test.beforeEach(async ({ page }) => {
    await useToken(page, admin.token)
  })

  for (const tab of ['fleet', 'trips', 'users']) {
    test(`admin console: ${tab}`, async ({ page }, testInfo) => {
      await page.goto(`/admin?tab=${tab}`)
      await expect(page.getByRole('heading', { name: 'Fleet Dispatch & Control' })).toBeVisible()
      await expect(page.locator('.ant-table-row').first()).toBeVisible()
      await check(page, testInfo, `admin-${tab}`)
    })
  }
})
