import { test as base, expect } from '@playwright/test';
import type { ConfigV1, ScreenV1, WidgetV1 } from '../src/lib/versions/1/types';

const properties = { position: { x: 10, y: 20 }, size: { w: 40, h: 50 } };
const webpage = (name: string, network: boolean): WidgetV1 => ({
  type: 'webpage', properties,
  settings: { webpage: { value: `/embedded/${name}` }, network: { value: network } },
});
const screen = (id: string, widgets: Record<string, WidgetV1>): ScreenV1 => ({
  id, name: id, durationSeconds: 10, widgets, widgetOrder: Object.keys(widgets),
});
export function playbackConfig(): ConfigV1 {
  return { version: 1, screenOrder: ['first'], screens: {
    first: screen('first', {
      color: { type: 'color', properties, settings: { color: { value: '#9b2727' } } },
      webpage: webpage('first', false),
    }),
  } };
}
export function rotationConfig(): ConfigV1 {
  const config = playbackConfig();
  config.screens.second = screen('second', { webpage: webpage('second', false) });
  config.screenOrder.push('second');
  return config;
}
export function networkConfig(): ConfigV1 {
  return { version: 1, screenOrder: ['first'], screens: {
    first: screen('first', { required: webpage('required', true), optional: webpage('optional', false) }),
  } };
}

type Harness = {
  config: unknown;
  configFailures: number;
  configPending: boolean;
  malformed: boolean;
  configRequests: number;
  hash: string;
  hashFailure: boolean;
  hashRequests: number;
  connectivity: 'online' | 'offline' | 'pending';
  probes: number;
  heartbeatFailure: boolean;
  heartbeats: { method: string; body: unknown }[];
  frames: string[];
  unexpected: string[];
};
export const test = base.extend<{ harness: Harness }>({
  harness: async ({ page, context }, use) => {
    const state: Harness = {
      config: playbackConfig(), configFailures: 0, configPending: false, malformed: false, configRequests: 0,
      hash: 'initial', hashFailure: false, hashRequests: 0,
      connectivity: 'online', probes: 0, heartbeatFailure: false,
      heartbeats: [], frames: [], unexpected: [],
    };
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4174') {
        state.unexpected.push(request.url());
        return route.abort();
      }
      switch (url.pathname) {
        case '/e2e-bundle/config.json':
          state.configRequests++;
          if (state.configPending) return;
          if (state.configFailures-- > 0) return route.fulfill({ status: 503 });
          if (state.malformed) return route.fulfill({ contentType: 'application/json', body: '{broken' });
          return route.fulfill({ json: state.config });
        case '/machine/v1/bundles/current/hash':
          state.hashRequests++;
          return route.fulfill({ status: state.hashFailure ? 503 : 200, json: { bundle_hash: state.hash } });
        case '/machine/v1/heartbeat':
          state.heartbeats.push({ method: request.method(), body: request.postDataJSON() });
          return route.fulfill({ status: state.heartbeatFailure ? 503 : 200, body: '' });
        case '/connectivity':
          state.probes++;
          if (state.connectivity === 'pending') return; // Let the application's timeout abort it.
          if (state.connectivity === 'offline') return route.abort('failed');
          return route.fulfill({ status: 204 });
      }
      if (url.pathname.startsWith('/embedded/')) {
        state.frames.push(url.pathname);
        return route.fulfill({ contentType: 'text/html', body: `<h1>Embedded ${url.pathname.split('/').pop()}</h1>` });
      }
      if (url.pathname === '/' || url.pathname.startsWith('/assets/')) return route.continue();
      state.unexpected.push(request.url());
      return route.abort();
    });
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00Z'));
    await use(state);
    expect(state.unexpected).toEqual([]);
  },
});
export { expect };
