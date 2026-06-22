# Playwright Smoke Tests

Maintly includes a local Playwright smoke-test suite for public pages, owner-demo navigation, account/data controls, mobile behavior, security headers, and accessibility.

## Install Browsers

After installing npm dependencies, install the Chromium browser used by the smoke suite:

```bash
npx playwright install chromium
```

CI uses:

```bash
npx playwright install --with-deps chromium
```

## Run Tests

```bash
npm run test:e2e
```

Interactive modes:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

The Playwright config starts the Next.js dev server automatically on `127.0.0.1:3217`. Override the port only for local conflicts:

```bash
PLAYWRIGHT_TEST_PORT=3317 npm run test:e2e
```

## Demo/Test Mode

The Playwright web server command explicitly clears Supabase and Stripe environment variables and sets `ENABLE_LOCAL_DEMO=1` plus `FLEETREADY_PLAYWRIGHT=1`. This opts into the no-Supabase local demo mode for owner routes. It does not add a production authentication bypass and does not call live Supabase or Stripe services.

Production behavior is unchanged. Installing Playwright does not enable demo mode by itself.

## Projects

- `chromium`: desktop public, owner-demo, account-control, security-header, and accessibility smoke tests.
- `mobile-chromium`: Pixel 5-style mobile smoke tests for landing, legal pages, dashboard, settings, mobile navigation, and account controls.

CI runs Chromium only to keep duration and platform variance low. Add Firefox and WebKit after they prove stable for this suite.

## Accessibility Gate

The suite uses `@axe-core/playwright` and fails on serious and critical violations. Moderate violations are attached to the Playwright test output for review but do not block initially.

No whole accessibility rule is disabled.

## Failure Artifacts

Playwright captures:

- screenshots only on failure;
- videos only on failure;
- traces on first retry.

Generated artifacts are written to:

- `playwright-report/`
- `test-results/`

These folders are ignored locally. CI uploads them only when the workflow fails.

## Not Covered Without Live Infrastructure

The smoke suite does not test:

- real Supabase authentication;
- live row-level-security integration;
- signed file downloads against Supabase Storage;
- real document uploads;
- Stripe Checkout or Billing Portal;
- Stripe webhook delivery;
- real email delivery.

Those flows need a configured test Supabase project, test Stripe account, and test email provider.
