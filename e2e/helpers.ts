import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export async function start(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await expect(page.locator('.hud-launchpad')).toBeVisible();
}

export async function pickProfile(page: Page, name: RegExp) {
  await page.getByRole('button', { name: /switch profile/i }).click();
  await page.getByRole('menuitemradio', { name }).click();
}

export async function openSalesHud(page: Page) {
  await pickProfile(page, /Sales/);
  await page.locator('.hud-tile--live').first().click();
  await expect(page.locator('.hud-area-list ol button').first()).toBeVisible();
}

/** Serious and critical accessibility problems only; minor ones are reported but do not fail. */
export async function expectAccessible(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const blocking = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n  ')}`).join('\n');
  expect(blocking, `${label}\n${summary}`).toEqual([]);
}
