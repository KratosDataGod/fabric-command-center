import { expect, test } from '@playwright/test';

import { expectAccessible, pickProfile, start } from './helpers';

test.beforeEach(async ({ page }) => start(page));

test('shows demo banner and a profile launchpad', async ({ page }) => {
  await expect(page.getByRole('note')).toContainText('synthetic data');
  await expect(page.locator('.hud-launch-title')).toBeVisible();
});

test('Admin profile lists the built-in admin content and FUAM', async ({ page }) => {
  await pickProfile(page, /Admin/);
  await expect(page.getByRole('heading', { name: 'Built into Fabric' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'FUAM' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Admin portal/ })).toHaveAttribute('href', /admin-portal/);
});

test('report tiles without IDs explain what to set up', async ({ page }) => {
  await pickProfile(page, /Admin/);
  await page.locator('.hud-tile--setup').first().click();
  const dialog = page.getByRole('dialog', { name: 'Setup needed' });
  await expect(dialog).toContainText('customize/profiles/admin.json');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('remembers the last profile', async ({ page }) => {
  await pickProfile(page, /Admin/);
  await page.reload();
  await expect(page.getByRole('button', { name: /Admin.*: switch profile/ })).toBeVisible();
});

test('launchpad is accessible in both looks', async ({ page }) => {
  await expectAccessible(page, 'launchpad, dark');
  await page.locator('.hud-status').getByRole('button', { name: /Comic mode/ }).click();
  await expectAccessible(page, 'launchpad, light');
});
