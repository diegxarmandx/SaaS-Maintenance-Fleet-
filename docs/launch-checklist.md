# Launch Checklist

This checklist describes readiness for a future deployment review. Deployment and Vercel configuration have not been performed in this step.

## Completed Locally

- Next.js production build passes locally.
- Linting, type checking, and automated tests run through npm scripts and GitHub Actions.
- Supabase migrations are versioned in `supabase/migrations`.
- Row-level security is enabled and forced for tenant-owned tables.
- Storage buckets and policies are defined in migrations.
- Stripe Checkout, Billing Portal, and verified webhook code paths are implemented for test mode.
- Active-asset limits are enforced in server actions and a PostgreSQL trigger.
- Owner-only product scope is documented.
- Light-mode design system is documented in `docs/design-system.md`.
- Privacy, terms, and support routes exist for review.
- Settings includes owner data export and account/company deletion request controls.
- Account deletion request migration is versioned and uses RLS.
- FleetReady Inbox maintenance receipt ingestion is implemented locally with server-only AI configuration, owner review, and manual fallback.
- Playwright browser, mobile, security-header, and accessibility smoke tests run locally and in CI using local demo mode.

## Required Before Deployment

- Apply all migrations to the reviewed Supabase project.
- Configure Supabase URL, anon key, and service-role key in the approved deployment environment.
- Create or reuse Stripe test-mode products and recurring prices.
- Set Stripe test price IDs and webhook secret.
- Configure `AI_INGESTION_PROVIDER`, `OPENAI_API_KEY`, and `OPENAI_INGESTION_MODEL` before expecting real FleetReady Inbox extraction. Leave `AI_INGESTION_PROVIDER=none` when AI extraction should be disabled.
- Run end-to-end Stripe Checkout and Billing Portal testing in test mode.
- Configure the approved scheduler for `/api/cron/reminders`.
- Choose and configure monitoring for app errors, webhook failures, scheduled-job failures, database errors, auth failures, upload failures, and email failures.
- Review backup and restore procedures for Supabase PostgreSQL and Storage.
- Complete browser QA across mobile, tablet, desktop, and wide desktop.
- Add live-infrastructure end-to-end tests for Supabase Auth, Storage signed URLs, Stripe Checkout/Portal, webhooks, and email once test services are configured.
- Confirm no secrets are committed and no service-role or Stripe secret key reaches the browser bundle.
- Configure and verify `SUPPORT_EMAIL`.
- Have privacy notice and terms reviewed by qualified counsel.
- Define the account deletion processing runbook, retention schedule, backup handling, and Storage object deletion process.

## Not Performed

- No Vercel project was created or modified.
- No Vercel environment variables were added.
- No Vercel Cron schedule was configured.
- No preview or production deployment was created.
- No production domain was configured.
- No live-mode Stripe products, prices, or charges were created.

## Backup Considerations

- Enable scheduled PostgreSQL backups before production use.
- Confirm restore drills before launch.
- Ensure private Storage buckets are covered by the chosen backup policy or documented recovery process.
- Keep Stripe subscription state recoverable through verified webhook replay or dashboard reconciliation.

## Troubleshooting

- Missing Supabase variables: owner routes will fail configuration checks or redirect to auth setup states.
- Missing Stripe variables: subscription plan buttons render disabled messaging and checkout cannot start.
- Invalid Stripe webhook signature: `/api/stripe/webhook` returns `400`.
- Duplicate Stripe event: webhook processing returns `duplicate: true`.
- Asset limit reached: `/fleet/new` shows the plan-limit state and direct writes are blocked by the database trigger.
- Cron secret missing: `/api/cron/reminders` returns `503`.
- Email provider disabled: reminders and notifications are generated, but email delivery is skipped with `EMAIL_PROVIDER=none`.
- Support email missing: `/support` shows a safe configuration warning and does not expose a fake contact.
- Deletion request recorded: Settings shows the request status, but no data is deleted until the operations workflow processes it.
- OpenAI missing or disabled: Inbox uploads can still fall back to manual entry, but real extraction will not run.
