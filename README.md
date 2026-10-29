# Deploys

## Create release

To create release:

1. Open PR into `production`
2. Set PR title to `Release v1.2.3`
3. Put release notes in PR body
4. Merge PR into `production`
5. Do not squash merge

## Notes

- Version comes from PR title, not `package.json`
- Release notes come from PR body
- Merge must target `production`
- PR must be merged; closed PR does nothing

## Tests

- `npm test`: Vitest unit tests.
- `npm run check`: application and E2E TypeScript checks.
- `npx playwright install --with-deps chromium`: install the E2E browser and Linux dependencies once.
- `npm run test:e2e`: build the app into `dist-e2e/` and run Chromium tests.
- `npm run test:e2e:ui`: open the interactive Playwright runner.
- `npx playwright show-report`: inspect the HTML report, failure screenshots, and traces.

E2E tests use a dedicated preview server at `http://127.0.0.1:4174`; this port must be free.
The suite sets its own Vite environment values and does not use `public/current/` configs.
Fixtures in `e2e/fixtures.ts` use the application's config types. Add small config builders
there for new scenarios, and add browser assertions to the relevant `.spec.ts` file.
The harness controls config, heartbeat, bundle hash, connectivity, and embedded-page
responses per test. Unexpected requests are blocked and fail the test. No live machine
client or external websites are required.

Tests use a fixed UTC clock and 1920×1080 viewport. Advance the Playwright clock and
wait for observable responses between polling steps instead of adding real-time sleeps.
CI runs a separate browser job with one worker and one retry, and uploads diagnostic
artifacts for 14 days. To check repeatability locally, run
`npm run test:e2e -- --repeat-each=3 --retries=0`.
