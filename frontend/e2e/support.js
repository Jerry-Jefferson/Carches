// Shared helpers for the end-to-end checks: accounts, API access through the dev proxy,
// signing in without the form, and the accessibility scan.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

export const API = '/api/v2'
const TOKEN_KEY = 'carshes.token' // utils/tokenStorage.js

// Admin credentials: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, or the values the admin
// migration used (backend/.env). Never hard-coded.
const readBackendEnv = () => {
  try {
    const path = fileURLToPath(new URL('../../backend/.env', import.meta.url))
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .filter((line) => /^[A-Z_]+=/.test(line))
        .map((line) => {
          const index = line.indexOf('=')
          return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, '')]
        }),
    )
  } catch {
    return {}
  }
}

export const adminCredentials = () => {
  const env = readBackendEnv()
  const email = process.env.E2E_ADMIN_EMAIL || env.ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD || env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or ADMIN_* in backend/.env)')
  }
  return { email, password }
}

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// A fresh user for each run, so the checks never depend on (or break) seeded accounts
export const newUserProfile = () => {
  const id = unique().toUpperCase()
  return {
    email: `e2e.${id.toLowerCase()}@carshes.test`,
    password: 'E2e-Password-123',
    firstName: 'Test',
    lastName: 'Driver',
    licenseNumber: `E2E${id}`.slice(0, 20),
  }
}

export const uniqueVin = () => `E2E${unique().toUpperCase()}`.slice(0, 17)

// `request` is Playwright's APIRequestContext; returns { status, body }
export const call = async (request, method, path, { token, data, params } = {}) => {
  const response = await request.fetch(`${API}${path}`, {
    method,
    data,
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const text = await response.text()
  return { status: response.status(), body: text ? JSON.parse(text) : null }
}

export const signUpByApi = async (request, profile = newUserProfile()) => {
  const { status, body } = await call(request, 'POST', '/auth/signup', { data: profile })
  expect(status, body?.message).toBe(201)
  return { ...profile, token: body.data.token, user: body.data.user }
}

export const signInByApi = async (request, { email, password }) => {
  const { status, body } = await call(request, 'POST', '/auth/signin', {
    data: { email, password },
  })
  expect(status, body?.message).toBe(200)
  return { token: body.data.token, user: body.data.user }
}

// Clean-up of what a run created (soft deletes, as the admin console does). Never throws.
export const removeUser = (request, adminToken, id) =>
  id ? call(request, 'DELETE', `/users/${id}`, { token: adminToken }).catch(() => null) : null

export const removeBooking = (request, adminToken, id) =>
  id ? call(request, 'DELETE', `/bookings/${id}`, { token: adminToken }).catch(() => null) : null

export const removeCar = (request, adminToken, vin) =>
  vin
    ? call(request, 'DELETE', `/cars/${encodeURIComponent(vin)}`, { token: adminToken }).catch(
        () => null,
      )
    : null

export const shortId = (id) => `#${String(id).slice(-6).toUpperCase()}` // utils/format.js

// Puts the token where the app looks for it ("Remember me"), before any page script runs
export const useToken = async (page, token) => {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [TOKEN_KEY, token],
  )
}

// Violations inside Ant Design Vue markup that the app can't change (ant-design-vue 4.2):
// the closed select's combobox ARIA, labelled sorter icons and the unlabelled page-size
// select of table pagination. Still attached to the report, but not failed.
const LIBRARY_ISSUES = [
  { rules: ['aria-required-attr', 'aria-valid-attr-value'], target: /ant-select|rc_select_/ },
  { rules: ['aria-prohibited-attr'], target: /ant-table-column-sorter/ },
  { rules: ['label'], target: /rc_select_/, inside: '.ant-pagination-options' },
]

const isLibraryIssue = (rule, node) =>
  LIBRARY_ISSUES.some(
    (issue) =>
      issue.rules.includes(rule) &&
      issue.target.test(node.target.join(' ')) &&
      (!issue.inside || node.inPagination),
  )

// Serious and critical WCAG 2.1 A/AA violations only; the rest is reported, not failed
export const expectAccessible = async (page, testInfo) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  })

  const blocking = []
  for (const violation of violations) {
    if (!['serious', 'critical'].includes(violation.impact)) continue
    const nodes = []
    for (const node of violation.nodes) {
      const selector = node.target.join(' ')
      // Only the pagination check needs the DOM
      const inPagination =
        violation.id === 'label' &&
        (await page
          .locator(selector)
          .first()
          .evaluate((element) => Boolean(element.closest('.ant-pagination-options')))
          .catch(() => false))
      if (!isLibraryIssue(violation.id, { ...node, inPagination })) nodes.push(selector)
    }
    if (nodes.length) blocking.push({ rule: violation.id, help: violation.help, targets: nodes })
  }
  expect(blocking, 'serious / critical accessibility violations').toEqual([])
}

// The page must not scroll sideways (tables scroll inside their own cards)
export const expectNoHorizontalScroll = async (page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'horizontal page overflow in px').toBeLessThanOrEqual(0)
}
