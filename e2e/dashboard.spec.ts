import { expect, test } from '@playwright/test';

import { expectAccessible, openSalesHud, start } from './helpers';

test.beforeEach(async ({ page }) => {
  await start(page);
  await openSalesHud(page);
});

const rows = (page: import('@playwright/test').Page) => page.locator('.hud-area-list ol button');

test('every panel renders without errors', async ({ page }) => {
  for (const area of ['core', 'kpis', 'globe', 'list', 'colors', 'year', 'feed']) {
    await expect(page.locator(`.hud-area-${area}`)).toBeVisible();
  }
  await expect(page.locator('.hud-error')).toHaveCount(0);
});

test('click locks on, Ctrl+click adds, tag releases', async ({ page }) => {
  await rows(page).nth(0).click();
  await expect(page.locator('.hud-tag')).toHaveCount(1);
  await rows(page).nth(1).click({ modifiers: ['Control'] });
  await expect(page.locator('.hud-tag')).toContainText(',');
  await page.locator('.hud-tag').click();
  await expect(page.locator('.hud-tag')).toHaveCount(0);
});

test('a lock changes the other panels', async ({ page }) => {
  const total = page.locator('.hud-area-kpis');
  await expect(total).not.toContainText('Loading');
  const before = await total.innerText();
  await page.locator('.hud-area-year').getByRole('button').nth(1).click().catch(async () => rows(page).nth(0).click());
  await expect.poll(async () => total.innerText()).not.toBe(before);
});

test('filters pane applies a filter', async ({ page }) => {
  await page.getByRole('button', { name: 'Filters' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox').first().check();
  await expect(page.locator('.hud-tag')).toHaveCount(1);
  await page.keyboard.press('Escape');
});

test('detail drawer shows rows', async ({ page }) => {
  await page.getByRole('button', { name: 'Detail' }).click();
  await expect(page.getByRole('dialog').locator('tbody tr').first()).toBeVisible();
});

test('saved views round-trip', async ({ page }) => {
  await rows(page).nth(0).click();
  await page.getByRole('button', { name: 'Views' }).click();
  await page.getByLabel('View name').fill('Top market');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /^Top market/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.hud-tag').click();
  await expect(page.locator('.hud-tag')).toHaveCount(0);
  await page.getByRole('button', { name: 'Views' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Top market/ }).click();
  await expect(page.locator('.hud-tag')).toHaveCount(1);
});

test('panel actions export CSV', async ({ page }) => {
  await page.locator('.hud-area-list').getByRole('button', { name: 'Panel actions' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /CSV/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
});

test('workbench builds a visual', async ({ page }) => {
  await page.getByRole('tab', { name: /Workbench/ }).click();
  await page.getByRole('button', { name: /Add visual/ }).click();
  await expect(page.getByRole('img', { name: 'Custom visual' }).first()).toBeVisible();
});

test('dashboard is accessible in both looks', async ({ page }) => {
  await expect(page.locator('.hud-skel')).toHaveCount(0);
  await expectAccessible(page, 'dashboard, dark');
  await page.locator('.hud-status').getByRole('button', { name: /Comic mode/ }).click();
  await page.waitForTimeout(800); // let the colour transition finish before measuring contrast
  await expectAccessible(page, 'dashboard, light');
});

test('readouts compare with the previous period', async ({ page }) => {
  await expect(page.locator('.hud-area-kpis .hud-delta').first()).toContainText(/vs \d{4}/);
  await page.locator('.hud-area-feed').getByText(/ VS /).first().waitFor();
});

test('presentation mode tours and exits with Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Present' }).click();
  const bar = page.getByRole('toolbar', { name: 'Presentation' });
  await expect(bar).toContainText('Overview');
  await expect(page.locator('.hud-header')).toBeHidden();
  await bar.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.hud-present-caption')).not.toHaveText('Overview');
  await page.keyboard.press('Escape');
  await expect(bar).toBeHidden();
  await expect(page.locator('.hud-header')).toBeVisible();
  await expect(page.locator('.hud-tag')).toHaveCount(0);
});

test('drawers keep keyboard focus while filters change', async ({ page }) => {
  await page.getByRole('button', { name: 'Filters' }).click();
  const box = page.getByRole('dialog').getByRole('checkbox').first();
  await box.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.hud-tag')).toHaveCount(1);
  await expect(box).toBeFocused();
  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role=dialog]')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Filters' })).toBeFocused();
});
