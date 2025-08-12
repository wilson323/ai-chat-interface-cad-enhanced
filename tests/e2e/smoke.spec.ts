import { test, expect } from '@playwright/test'

const healthOk = new Set(['healthy', 'degraded'])

test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/AI|Chat|CAD|Poster/i)
})

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const json = await res.json()
  expect(healthOk.has(json.status)).toBeTruthy()
  expect(json.checks?.api?.status).toBeDefined()
})
