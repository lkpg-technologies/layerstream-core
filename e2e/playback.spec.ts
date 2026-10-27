import { test, expect, rotationConfig } from './fixtures';

test('renders color and embedded content at the configured position', async ({ page, harness }) => {
  await page.goto('/');
  await expect(page.locator('.color')).toHaveCSS('background-color', 'rgb(155, 39, 39)');
  await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText('Embedded first');
  await expect(page.locator('.widget').first()).toHaveCSS('left', '192px');
  await expect(page.locator('.widget').first()).toHaveCSS('top', '216px');
  await expect(page.locator('.widget').first()).toHaveCSS('width', '768px');
  await expect(page.locator('.widget').first()).toHaveCSS('height', '540px');
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  expect(harness.configRequests).toBe(1);
});

test('preloads, rotates without remounting, and wraps around', async ({ page, harness }) => {
  harness.config = rotationConfig();
  await page.goto('/');
  const first = page.locator('iframe[src="/embedded/first"]');
  const second = page.locator('iframe[src="/embedded/second"]');
  await expect(first).toBeVisible();
  await expect(second).toHaveCount(0);
  await page.clock.runFor(5_000);
  await expect(second).toHaveCount(1);
  await expect(second).toBeHidden();
  await expect.poll(() => harness.frames.filter(path => path === '/embedded/second').length).toBe(1);
  await second.evaluate(element => element.setAttribute('data-preloaded', 'yes'));
  await page.clock.runFor(5_000);
  await expect(second).toBeVisible();
  await expect(second).toHaveAttribute('data-preloaded', 'yes');
  expect(harness.frames.filter(path => path === '/embedded/second')).toHaveLength(1);
  await expect(first).toHaveCount(0);
  await page.clock.runFor(10_000);
  await expect(first).toBeVisible();
  await expect(second).toHaveCount(0);
});

test('shows the empty bundle fallback', async ({ page, harness }) => {
  harness.config = { version: 1, screens: {}, screenOrder: [] };
  await page.goto('/');
  await expect(page.getByText('No active bundle')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});
