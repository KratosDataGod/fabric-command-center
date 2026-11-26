import { expect, test } from '@playwright/test';

import { expectAccessible, start } from './helpers';

test('Brand Studio restyles the app live and exports brand.json', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Brand Studio' }).click();
  const studio = page.getByRole('complementary', { name: 'Brand Studio' });
  await expect(studio).toBeVisible();
  await expectAccessible(page, 'brand studio');
  const hex = studio.getByLabel('Series 1 hex');
  await hex.fill('#ff8c');
  await expect(hex).toHaveValue('#ff8c');
  await hex.fill('#ff8c00');
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--fcc-hud-s0'))).toBe('#ff8c00');
  await studio.getByLabel('Secondary text hex').fill('#202020');
  await expect(studio.getByRole('region', { name: 'Readability' })).toContainText('colors.hud.dim');
  const download = page.waitForEvent('download');
  await studio.getByRole('button', { name: /Download brand.json/ }).click();
  expect((await download).suggestedFilename()).toBe('brand.json');
});
