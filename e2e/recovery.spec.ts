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

for (const failures of [1, 2]) {
  test(`${failures} failed probe(s) do not interrupt playback and success resets failures`, async ({ page, harness }) => {
    harness.config = networkConfig();
    await page.goto('/');
    const required = page.locator('iframe[src="/embedded/required"]');
    await expect(required).toBeVisible();
    await required.evaluate(el => el.setAttribute('data-original', 'yes'));
    for (let round = 0; round < 2; round++) {
      harness.connectivity = 'offline';
      for (let i = 0; i < failures; i++) {
        const probes = harness.probes;
        await page.clock.runFor(5_000);
        await expect.poll(() => harness.probes).toBe(probes + 1);
        await expect(required).toBeVisible();
        await expect(required).toHaveAttribute('data-original', 'yes');
        await expect(page.getByText('No network connection.')).toHaveCount(0);
      }
      harness.connectivity = 'online';
      const probes = harness.probes;
      await page.clock.runFor(5_000);
      await expect.poll(() => harness.probes).toBe(probes + 1);
      await expect(required).toHaveAttribute('data-original', 'yes');
    }
    expect(harness.frames.filter(path => path === '/embedded/required')).toHaveLength(1);
  });
}

test('loses connectivity during playback and refreshes once on recovery', async ({ page, harness }) => {
  harness.config = networkConfig();
  await page.goto('/');
  const required = page.locator('iframe[src="/embedded/required"]');
  const optional = page.locator('iframe[src="/embedded/optional"]');
  await expect(required).toBeVisible();
  await optional.evaluate(el => el.setAttribute('data-original', 'yes'));
  harness.connectivity = 'offline';
  for (let i = 0; i < 3; i++) {
    const probes = harness.probes;
    await page.clock.runFor(5_000);
    await expect.poll(() => harness.probes).toBe(probes + 1);
  }
  await expect(required).toHaveCount(0);
  await expect(page.getByText('No network connection.')).toBeVisible();
  await expect(optional).toBeVisible();
  await expect(optional).toHaveAttribute('data-original', 'yes');
  harness.connectivity = 'online';
  await page.clock.runFor(5_000);
  await expect(required).toBeVisible();
  await expect(optional).not.toHaveAttribute('data-original');
  await expect.poll(() => harness.frames.length).toBe(4);
  await page.clock.runFor(10_000);
  await expect(required).toBeVisible();
  await expect(optional).toBeVisible();
  expect(harness.frames).toHaveLength(4);
});

test('times out a hung config request and resumes playback after retry', async ({ page, harness }) => {
  harness.config = rotationConfig();
  harness.configPending = true;
  await page.goto('/');
  await expect.poll(() => harness.configRequests).toBe(1);
  await page.clock.runFor(9_999);
  await expect(page.getByText('Loading…')).toBeVisible();
  expect(harness.configRequests).toBe(1);
  await page.clock.runFor(1);
  harness.configPending = false;
  await page.clock.runFor(2_000);
  await expect.poll(() => harness.configRequests).toBe(2);
  await expect(page.locator('iframe[src="/embedded/second"]')).toBeVisible();
  await page.clock.runFor(8_000);
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
});

test('backs off recovery across real reloads and resumes playback', async ({ page, harness }) => {
  harness.config = rotationConfig();
  await page.goto('/');
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
  for (const [attempt, delay] of [[1, 30_000], [2, 60_000]]) {
    await page.evaluate(() => {
      for (let i = 0; i < 20; i++) window.dispatchEvent(new ErrorEvent('error', { message: 'e2e recovery fault' }));
    });
    await page.clock.runFor(delay - 1);
    expect(harness.configRequests).toBe(attempt);
    await page.clock.runFor(1);
    await expect.poll(() => harness.configRequests).toBe(attempt + 1);
    await expect(page.locator('.screen-slot:not(.preloading) iframe')).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('layerstream:recoveryReloads'))).toBe(String(attempt));
  }
  await expect(page.locator('iframe[src="/embedded/second"]')).toBeVisible();
  await page.clock.runFor(10_000);
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
  expect(harness.configRequests).toBe(3);
});

test('daily reload resumes playback without immediately reloading again', async ({ page, harness }) => {
  harness.config = rotationConfig();
  await page.clock.setSystemTime(new Date('2026-01-02T02:59:30Z'));
  await page.goto('/');
  await expect(page.locator('iframe[src="/embedded/second"]')).toBeVisible();
  await page.clock.runFor(29_999);
  expect(harness.configRequests).toBe(1);
  await page.clock.runFor(1);
  await expect.poll(() => harness.configRequests).toBe(2);
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
  await page.clock.runFor(10_000);
  await expect(page.locator('iframe[src="/embedded/second"]')).toBeVisible();
  await page.clock.runFor(50_000);
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
  expect(harness.configRequests).toBe(2);
});
