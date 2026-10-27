import { test, expect, networkConfig, rotationConfig } from './fixtures';

for (const failure of ['http', 'malformed'] as const) {
  test(`recovers from ${failure} config failure`, async ({ page, harness }) => {
    harness.configFailures = failure === 'http' ? 1 : 0;
    harness.malformed = failure === 'malformed';
    await page.goto('/');
    await expect(page.getByText('Loading…')).toBeVisible();
    await expect.poll(() => harness.configRequests).toBe(1);
    harness.malformed = false;
    await page.clock.runFor(2_000);
    await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText('Embedded first');
    expect(harness.configRequests).toBe(2);
  });
}

test('shows network states and refreshes embedded pages after recovery', async ({ page, harness }) => {
  harness.config = networkConfig();
  harness.connectivity = 'pending';
  await page.goto('/');
  await expect(page.getByText('Checking network connection…')).toBeVisible();
  const optional = page.locator('iframe[src="/embedded/optional"]');
  await expect(optional).toBeVisible();
  await optional.evaluate(element => element.setAttribute('data-original', 'yes'));
  harness.connectivity = 'offline';
  await page.clock.runFor(4_000);
  await page.clock.runFor(5_000);
  await expect.poll(() => harness.probes).toBe(2);
  await page.clock.runFor(5_000);
  await expect(page.getByText('No network connection.')).toBeVisible();
  await expect(optional).toBeVisible();
  await expect(optional).toHaveAttribute('data-original', 'yes');
  harness.connectivity = 'online';
  await page.clock.runFor(5_000);
  await expect(page.locator('iframe[src="/embedded/required"]')).toBeVisible();
  await expect(optional).not.toHaveAttribute('data-original');
  await expect.poll(() => harness.frames.filter(path => path === '/embedded/optional').length).toBe(2);
  await expect(page.getByText('No network connection.')).toHaveCount(0);
});

test('only a changed hash reloads and loads the replacement bundle', async ({ page, harness }) => {
  await page.goto('/');
  await expect(page.locator('.color')).toBeVisible();
  await expect.poll(() => harness.hashRequests).toBe(1);
  await page.clock.runFor(5_000);
  await expect.poll(() => harness.hashRequests).toBe(2);
  expect(harness.configRequests).toBe(1);
  harness.hashFailure = true;
  await page.clock.runFor(5_000);
  await expect.poll(() => harness.hashRequests).toBe(3);
  expect(harness.configRequests).toBe(1);
  await expect(page.locator('.color')).toBeVisible();
  const replacement = rotationConfig();
  replacement.screenOrder = ['second'];
  harness.config = replacement;
  harness.hashFailure = false;
  harness.hash = 'replacement';
  await page.clock.runFor(5_000);
  await expect(page).toHaveURL(/\?v=\d+$/);
  await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText('Embedded second');
  expect(harness.configRequests).toBe(2);
});

test('sends heartbeats and keeps playback running through failures', async ({ page, harness }) => {
  harness.heartbeatFailure = true;
  harness.config = rotationConfig();
  await page.goto('/');
  await expect.poll(() => harness.heartbeats.length).toBe(1);
  expect(harness.heartbeats[0]).toEqual({ method: 'POST', body: { version: 'e2e' } });
  await page.clock.runFor(10_000);
  await expect(page.locator('iframe[src="/embedded/second"]')).toBeVisible();
  await expect.poll(() => harness.heartbeats.length).toBe(2);
  harness.heartbeatFailure = false;
  await page.clock.runFor(10_000);
  await expect.poll(() => harness.heartbeats.length).toBe(3);
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
  expect(harness.configRequests).toBe(1);
});
