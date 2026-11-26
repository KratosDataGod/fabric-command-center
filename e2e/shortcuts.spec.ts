import { expect, test } from '@playwright/test';

import { expectAccessible, pickProfile, start } from './helpers';

test.beforeEach(async ({ page }) => start(page));

test('Ctrl+K finds a tile in another profile and opens it', async ({ page }) => {
  await pickProfile(page, /Admin/);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search everything' });
  await expect(dialog).toBeVisible();
  await expectAccessible(page, 'command palette');
  await page.keyboard.type('sales live');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.hud-area-list')).toBeVisible();
});

test('palette switches profiles with the keyboard', async ({ page }) => {
  await page.getByRole('button', { name: /^Search/ }).click();
  await page.keyboard.type('admin');
  const option = page.getByRole('option', { name: /Fabric Admin|Admin/ }).filter({ hasText: 'Switch profile' });
  await option.click();
  await expect(page.getByRole('heading', { name: 'Built into Fabric' })).toBeVisible();
});

test('pins show on every launchpad and recents are recorded', async ({ page }) => {
  await pickProfile(page, /Admin/);
  await page.getByRole('button', { name: /^Pin Admin portal/ }).click();
  await pickProfile(page, /Sales/);
  const pinned = page.getByRole('region', { name: 'Pinned' });
  await expect(pinned).toContainText('Admin portal');
  await page.locator('.hud-tile--live').first().click();
  await page.locator('.hud-crumb').click();
  await expect(page.getByRole('region', { name: 'Recently opened' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Pinned' })).toContainText('Admin portal');
});
