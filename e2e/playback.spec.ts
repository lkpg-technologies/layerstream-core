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

test('plays short screens and repeated IDs without duplicate mounts or blank transitions', async ({ page, harness }) => {
  const config = rotationConfig();
  config.screens.first.durationSeconds = 2;
  config.screens.second.durationSeconds = 2;
  config.screenOrder = ['first', 'first', 'second'];
  harness.config = config;
  await page.goto('/');
  const first = page.locator('iframe[src="/embedded/first"]');
  await expect(first).toBeVisible();
  await first.evaluate(el => el.setAttribute('data-original', 'yes'));
  for (const [index, [name, mounted]] of ([['first', 2], ['second', 2], ['first', 1], ['first', 2], ['second', 2], ['first', 1]] as const).entries()) {
    await page.clock.runFor(2_000);
    await expect(page.locator('.screen-slot:not(.preloading) iframe')).toHaveCount(1);
    await expect(page.locator(`iframe[src="/embedded/${name}"]`)).toBeVisible();
    await expect(page.locator('iframe[src="/embedded/first"]')).toHaveCount(1);
    await expect(page.locator('.screen-slot')).toHaveCount(mounted);
    if (index === 0) await expect(first).toHaveAttribute('data-original', 'yes');
  }
});

test('drops invalid config entries while valid content keeps rotating', async ({ page, harness }) => {
  const config = rotationConfig();
  harness.config = {
    ...config,
    screenOrder: ['missing', 'invalid', 'first', 'second'],
    screens: {
      ...config.screens,
      invalid: { ...config.screens.first, id: 'invalid', durationSeconds: 0 },
      first: {
        ...config.screens.first,
        widgets: { ...config.screens.first.widgets, broken: { type: 'webpage' } },
        widgetOrder: ['broken', 'missing', ...config.screens.first.widgetOrder],
      },
    },
  };
  await page.goto('/');
  await expect(page.locator('.color')).toBeVisible();
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
  await expect(page.locator('.widget')).toHaveCount(2);
  await page.clock.runFor(10_000);
  await expect(page.locator('iframe[src="/embedded/second"]')).toBeVisible();
  await page.clock.runFor(10_000);
  await expect(page.locator('iframe[src="/embedded/first"]')).toBeVisible();
  expect(harness.configRequests).toBe(1);
});

test('preloads video without playing and starts it when the screen becomes active', async ({ page, harness }) => {
  const config = rotationConfig();
  config.screens.second.widgets = {
    video: { type: 'video', properties: { position: { x: 0, y: 0 }, size: { w: 44, h: 100 } },
      settings: { src: { value: 'assets/movie.webm' }, fit: { value: 'contain' },
        loop: { value: true }, muted: { value: true } } },
  };
  config.screens.second.widgetOrder = ['video'];
  harness.config = config;
  await page.route('**/e2e-bundle/assets/movie.webm', route => route.fulfill({ contentType: 'video/webm', body: '' }));
  // Observe playback requests independently of codec support and browser autoplay policy.
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dataset.playCalls = String(Number(this.dataset.playCalls ?? 0) + 1);
      return Promise.resolve();
    };
  });
  await page.goto('/');
  await page.clock.runFor(5_000);
  const video = page.locator('video');
  await expect(video).toHaveCount(1);
  await expect(video).toBeHidden();
  await expect(video).not.toHaveAttribute('data-play-calls');
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('loop', true);
  await page.clock.runFor(5_000);
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('data-play-calls', '1');
  await expect(video).toHaveCSS('object-fit', 'contain');
  await page.clock.runFor(10_000);
  await expect(video).toHaveCount(0);
});

test('video-end loops shorter videos when enabled and waits for every first playthrough', async ({ page, harness }) => {
  const config = rotationConfig();
  config.screens.first.playbackMode = 'video-end';
  config.screenOrder = ['first', 'first', 'second'];
  config.screens.first.widgets = Object.fromEntries(['a', 'b'].map(id => [id, {
    type: 'video' as const,
    properties: { position: { x: 0, y: 0 }, size: { w: 50, h: 100 } },
    settings: { src: { value: 'assets/movie.webm' }, loop: { value: id === 'a' } },
  }]));
  config.screens.first.widgetOrder = ['a', 'b'];
  harness.config = config;
  await page.route('**/e2e-bundle/assets/movie.webm', route => route.fulfill({ contentType: 'video/webm', body: '' }));
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'error', { get: () => null });
    HTMLMediaElement.prototype.load = function () {};
    HTMLMediaElement.prototype.play = function () {
      this.dataset.playCalls = String(Number(this.dataset.playCalls ?? 0) + 1);
      return Promise.resolve();
    };
    // This test controls completion independently of decoding a media fixture.
    document.addEventListener('error', event => {
      if (event.target instanceof HTMLMediaElement) event.stopImmediatePropagation();
    }, true);
  });
  await page.goto('/');
  const videos = page.locator('video');
  await expect(videos).toHaveCount(2);
  await expect(videos.first()).toHaveJSProperty('loop', false);
  await page.clock.runFor(25_000);
  await expect(videos.first()).toBeVisible();
  await videos.first().dispatchEvent('ended');
  await expect(videos.first()).toHaveAttribute('data-play-calls', '2');
  await expect(videos.last()).toHaveAttribute('data-play-calls', '1');
  await videos.first().dispatchEvent('ended');
  await expect(videos.first()).toHaveAttribute('data-play-calls', '3');
  await expect(videos.last()).toBeVisible();
  await videos.last().dispatchEvent('ended');
  await expect(videos.first()).toHaveAttribute('data-play-calls', '4');
  await expect(videos.last()).toHaveAttribute('data-play-calls', '2');
  await videos.first().dispatchEvent('ended');
  await expect(videos.last()).toBeVisible();
  await videos.last().dispatchEvent('ended');
  const second = page.locator('iframe[src="/embedded/second"]');
  await expect(second).toBeVisible();
  await page.clock.runFor(9_000);
  await expect(second).toBeVisible();
  await page.clock.runFor(1_000);
  await expect(videos.first()).toBeVisible();
});

for (const scenario of ['loading', 'stalled', 'healthy', 'short'] as const) {
  test(`video-end recovers from ${scenario} playback without a total-duration limit`, async ({ page, harness }) => {
    const config = rotationConfig();
    config.screens.first.playbackMode = 'video-end';
    config.screens.first.widgets = {
      video: { type: 'video', properties: { position: { x: 0, y: 0 }, size: { w: 100, h: 100 } },
        settings: { src: { value: 'assets/movie.webm' }, loop: { value: false } } },
    };
    config.screens.first.widgetOrder = ['video'];
    harness.config = config;
    await page.route('**/e2e-bundle/assets/movie.webm', route => route.fulfill({ contentType: 'video/webm', body: '' }));
    await page.addInitScript((scenario) => {
      Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
        get: () => scenario === 'loading' ? NaN : scenario === 'short' ? 2 : 60,
      });
      Object.defineProperty(HTMLMediaElement.prototype, 'error', { get: () => null });
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        get() { return Number(this.dataset.position ?? 0); },
        set(value) { this.dataset.position = String(value); },
      });
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      document.addEventListener('error', event => {
        if (event.target instanceof HTMLMediaElement) event.stopImmediatePropagation();
      }, true);
    }, scenario);
    await page.goto('/');
    const video = page.locator('video');
    await expect(video).toBeVisible();
    if (scenario === 'stalled' || scenario === 'healthy') {
      // Keep progressing beyond both durationSeconds and the watchdog interval.
      for (let second = 1; second <= (scenario === 'healthy' ? 75 : 60); second++) {
        await video.evaluate((element, time) => { (element as HTMLVideoElement).currentTime = time; }, scenario === 'healthy' ? second / 2 : second);
        await page.clock.runFor(1_000);
      }
      await expect(video).toBeVisible();
    }
    if (scenario === 'healthy') {
      await video.dispatchEvent('ended');
    } else {
      // Neither buffering events nor timeupdate without movement reset the timeout.
      for (let second = 0; second < (scenario === 'loading' ? 29 : scenario === 'short' ? 9 : 4); second++) {
        await video.dispatchEvent(second % 2 ? 'waiting' : 'stalled');
        await video.dispatchEvent('timeupdate');
        await page.clock.runFor(1_000);
      }
      await expect(video).toBeVisible();
      await page.clock.runFor(1_000);
    }
    await expect(page.locator('iframe[src="/embedded/second"]')).toBeVisible();
  });
}

for (const screenOrder of [['first'], ['first', 'first']]) {
  test(`restarts duration-only video at each slot for ${screenOrder.length} playlist entries`, async ({ page, harness }) => {
    const config = rotationConfig();
    config.screenOrder = screenOrder;
    config.screens.first.durationSeconds = 2;
    config.screens.first.widgets = {
      video: { type: 'video', properties: { position: { x: 0, y: 0 }, size: { w: 100, h: 100 } },
        settings: { src: { value: 'assets/movie.webm' }, loop: { value: false } } },
    };
    config.screens.first.widgetOrder = ['video'];
    harness.config = config;
    await page.route('**/e2e-bundle/assets/movie.webm', route => route.fulfill({ contentType: 'video/webm', body: '' }));
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        get() { return Number(this.dataset.position ?? 0); },
        set(value) { this.dataset.position = String(value); },
      });
      HTMLMediaElement.prototype.play = function () {
        this.dataset.playCalls = String(Number(this.dataset.playCalls ?? 0) + 1);
        return Promise.resolve();
      };
    });
    await page.goto('/');
    const video = page.locator('video');
    await expect(video).toHaveAttribute('data-play-calls', '1');
    await expect(video).toHaveJSProperty('loop', false);
    await video.evaluate(element => element.setAttribute('data-original', 'yes'));
    for (let slot = 1; slot <= 3; slot++) {
      await video.evaluate(element => { (element as HTMLVideoElement).currentTime = 1; });
      await video.dispatchEvent('ended');
      await page.clock.runFor(1_000);
      await expect(video).toHaveAttribute('data-play-calls', String(slot));
      await page.clock.runFor(1_000);
      await expect(video).toHaveAttribute('data-play-calls', String(slot + 1));
      await expect(video).toHaveJSProperty('currentTime', 0);
      await expect(video).toHaveAttribute('data-original', 'yes');
    }
  });
}
