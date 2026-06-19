import { test, expect, type Page } from '@playwright/test'

const BASE = 'https://fixlab-app.web.app'
const EMAIL = 'testnegozio@gmail.com'
const PASSWORD = '123456@Sa'
const STUDIO_ID = 'trJMfTgRvbOXmkTZOtNTi79bKa63'

async function prepareWebSession(page: Page) {
  await page.goto(BASE)
  await page.evaluate((studioId: string) => {
    localStorage.setItem(
      'fixlab.welcomeChoice',
      JSON.stringify({ mode: 'web', completedAt: new Date().toISOString() }),
    )
    sessionStorage.setItem(`fixlab-onboarding-dismissed:${studioId}`, '1')
  }, STUDIO_ID)
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole('button', { name: 'Accetta tutto' })
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accept.click()
  }
}

async function dismissOnboarding(page: Page) {
  await page.evaluate((studioId: string) => {
    sessionStorage.setItem(`fixlab-onboarding-dismissed:${studioId}`, '1')
  }, STUDIO_ID)

  const overlay = page.locator('.gestionale-onboarding-overlay')
  if (await overlay.isVisible({ timeout: 1500 }).catch(() => false)) {
    const skip = page.getByRole('button', { name: 'Salta per ora' })
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skip.click()
    }
    await overlay.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})
  }
}

async function login(page: Page) {
  await prepareWebSession(page)
  await page.goto(`${BASE}/login`)
  await page.locator('#login-email, input[type="email"]').first().fill(EMAIL)
  await page.locator('#login-password, input[type="password"]').first().fill(PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/\/(?!login|welcome)/, { timeout: 45000 })
  await dismissCookies(page)
  await page.locator('.gestionale-shell').waitFor({ timeout: 30000 })
  await dismissOnboarding(page)
}

async function expectSection(page: Page) {
  await expect(page.locator('.gestionale-page').first()).toBeVisible({ timeout: 15000 })
}

async function clickNav(page: Page, label: string) {
  await dismissOnboarding(page)
  await page
    .locator('.gestionale-toolbar__item')
    .filter({ has: page.locator('.gestionale-toolbar__label', { hasText: label }) })
    .click()
  await page.waitForTimeout(800)
  await dismissOnboarding(page)
}

test.describe('FIXLab E2E Audit', () => {
  test('Login e dashboard', async ({ page }) => {
    await login(page)
    await expect(page.locator('body')).not.toContainText('Email o password errati')
    await expect(page.locator('.gestionale-shell')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.gestionale-start-header')).toBeVisible({ timeout: 20000 })
  })

  test('Sezione Clienti carica', async ({ page }) => {
    await login(page)
    const t0 = Date.now()
    await clickNav(page, 'Clienti')
    await expectSection(page)
    await page.waitForSelector('[data-tutorial="page-clienti"]', { timeout: 15000 })
    expect(Date.now() - t0).toBeLessThan(12000)
  })

  test('Sezione Fornitori carica', async ({ page }) => {
    await login(page)
    await clickNav(page, 'Fornitori')
    await expectSection(page)
  })

  test('Sezione Prodotti/Magazzino carica', async ({ page }) => {
    await login(page)
    const t0 = Date.now()
    await clickNav(page, 'Prodotti')
    await page.waitForSelector('[data-tutorial="page-prodotti"], .prodotti-section, .gestionale-page', {
      timeout: 20000,
    })
    expect(Date.now() - t0).toBeLessThan(12000)
  })

  test('Sezione Riparazioni carica', async ({ page }) => {
    await login(page)
    await clickNav(page, 'Riparazioni')
    await expectSection(page)
  })

  test('Menu Documenti apre', async ({ page }) => {
    await login(page)
    await dismissOnboarding(page)
    await page.locator('.gestionale-toolbar__item').filter({ hasText: 'Documenti' }).first().click()
    await expect(page.locator('.gestionale-mdi-window, .gestionale-page, [class*="documenti"]')).toBeVisible({
      timeout: 15000,
    })
  })

  test('Sezione Pagamenti carica', async ({ page }) => {
    await login(page)
    await dismissOnboarding(page)
    await page.locator('.gestionale-toolbar__item').filter({ hasText: 'Pagamenti' }).first().click()
    await expect(page.getByText('Pagamenti', { exact: true }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Studio non disponibile')).not.toBeVisible()
  })

  test('Sezione Movimenti carica', async ({ page }) => {
    await login(page)
    await clickNav(page, 'Magazzino')
    await expectSection(page)
  })

  test('Ricerca clienti', async ({ page }) => {
    await login(page)
    await clickNav(page, 'Clienti')
    const search = page.locator('input[placeholder*="Cerca"], input[type="search"]').first()
    await search.waitFor({ timeout: 10000 })
    await search.fill('Rossi')
    await page.waitForTimeout(800)
    await expectSection(page)
  })

  test('Nessun crash JS critico in console', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await login(page)
    for (const label of ['Clienti', 'Prodotti', 'Riparazioni', 'Fornitori']) {
      await clickNav(page, label)
      await page.waitForTimeout(1200)
    }
    const critical = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('chunk'))
    expect(critical).toEqual([])
  })
})
