import { expect, test } from '@playwright/test';

import { openSalesHud, start } from './helpers';

test('no horizontal scroll on launchpad or dashboard', async ({ page }) => {
  await start(page);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(1);
  await openSalesHud(page);
  expect(await overflow()).toBeLessThanOrEqual(1);
});
