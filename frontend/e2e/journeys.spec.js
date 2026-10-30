// Q-04: smoke tests of the main journeys (plan §15), through the UI of the running stack.

import { test, expect } from '@playwright/test'

import {
  adminCredentials,
  call,
  newUserProfile,
  removeBooking,
  removeCar,
  removeUser,
  shortId,
  signInByApi,
  signUpByApi,
  uniqueVin,
  useToken,
} from './support'

let admin

test.beforeAll(async ({ request }) => {
  admin = await signInByApi(request, adminCredentials())
})

test('a guest is sent to sign in and comes back to the page they asked for', async ({
  page,
  request,
}) => {
  const user = await signUpByApi(request)
  try {
    await page.goto('/trips')
    await expect(page).toHaveURL(/\/auth\?redirect=(%2F|\/)trips/)

    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(/\/trips$/)
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible()
  } finally {
    await removeUser(request, admin.token, user.user._id)
  }
})

test('sign up → book a car → My Trips → the admin completes the trip → the car is free', async ({
  page,
  browser,
  request,
}) => {
  const profile = newUserProfile()
  let userId = null
  let bookingId = null
  try {
    // Sign up through the form
    await page.goto('/auth?mode=signup')
    await page.getByLabel('First name').fill(profile.firstName)
    await page.getByLabel('Last name').fill(profile.lastName)
    await page.getByLabel("Driver's licence number").fill(profile.licenseNumber)
    await page.getByLabel('Email').fill(profile.email)
    await page.getByLabel('Password', { exact: true }).fill(profile.password)
    await page.getByLabel('Confirm password').fill(profile.password)
    await page.locator('form button[type="submit"]').click()
    await expect(page).toHaveURL(/\/fleet/)

    const { token, user } = await signInByApi(request, profile)
    userId = user._id
    const { body } = await call(request, 'GET', '/cars', { token })
    const car = body.data.find((item) => item.status === 'free')
    test.skip(!car, 'no free car: re-seed the cars')

    // Book it from the car page
    await page.goto(`/cars/${car._id}`)
    await page.getByRole('button', { name: /Confirm booking/ }).click()
    const confirmed = page.getByRole('dialog').filter({ hasText: 'Booking confirmed' })
    await expect(confirmed).toBeVisible()
    await confirmed.getByRole('button', { name: 'Go to My Trips' }).click()

    await expect(page).toHaveURL(/\/trips$/)
    await expect(page.getByText('Current trip')).toBeVisible()
    await expect(page.getByText(car.registrationNumber).first()).toBeVisible()
    const { body: mine } = await call(request, 'GET', '/bookings/my', { token })
    const booking = mine.data[0]
    bookingId = booking._id
    expect((await call(request, 'GET', `/cars/${car._id}`, { token })).body.data.status).toBe(
      'in_use',
    )

    // The admin completes it from the console
    const adminPage = await browser.newPage()
    await useToken(adminPage, admin.token)
    await adminPage.goto('/admin?tab=trips')
    await adminPage
      .getByRole('button', { name: `Complete booking ${shortId(booking._id)}` })
      .click()
    const dialog = adminPage.getByRole('dialog').filter({ hasText: 'Complete trip' })
    await dialog.getByRole('button', { name: 'Complete trip' }).click()
    await expect(adminPage.getByText('Trip completed')).toBeVisible()
    await adminPage.close()

    const after = await call(request, 'GET', `/cars/${car._id}`, { token })
    expect(after.body.data.status).toBe('free')
  } finally {
    await removeBooking(request, admin.token, bookingId)
    await removeUser(request, admin.token, userId)
  }
})

test('the admin adds, edits and removes a vehicle', async ({ page, request }) => {
  const vin = uniqueVin()
  const plate = `E2E ${vin.slice(-4)}-7`
  try {
    await useToken(page, admin.token)
    await page.goto('/admin?tab=fleet')
    await page.getByRole('button', { name: 'Add vehicle' }).first().click()

    const form = page.getByRole('dialog').filter({ hasText: 'Add vehicle' })
    await form.getByLabel('Brand').fill('Smoketest')
    await form.getByLabel('Model').fill('E2E')
    await form.getByLabel('Year').fill('2024')
    await form.getByLabel('VIN').fill(vin)
    await form.getByLabel('Registration number').fill(plate)
    await form.getByRole('button', { name: 'Add vehicle' }).click()
    await expect(page.getByText('Car added')).toBeVisible()

    await page.getByPlaceholder(/Search brand, model, plate or VIN/).fill(vin)
    const row = page.locator('.ant-table-row').filter({ hasText: vin })
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: 'Edit Smoketest E2E' }).click()
    const edit = page.getByRole('dialog').filter({ hasText: 'Edit Smoketest E2E' })
    await edit.getByLabel('Registration number').fill(`${plate}X`)
    await edit.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Car updated')).toBeVisible()
    await expect(row).toContainText(`${plate}X`)

    await row.getByRole('button', { name: 'Delete Smoketest E2E' }).click()
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(row).toHaveCount(0)
  } finally {
    await removeCar(request, admin.token, vin)
  }
})

test('keyboard: skip link, and the booking window returns focus when closed', async ({
  page,
  request,
}) => {
  const user = await signUpByApi(request)
  try {
    await useToken(page, user.token)
    await page.goto('/fleet')
    await expect(page.locator('article').first()).toBeVisible()

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()

    const book = page.getByRole('button', { name: /Book Now/ }).first()
    test.skip((await book.count()) === 0, 'no free car: re-seed the cars')
    await book.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Focus moves into the window once it has opened
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(book).toBeFocused()
  } finally {
    await removeUser(request, admin.token, user.user._id)
  }
})
