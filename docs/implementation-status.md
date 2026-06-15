# Implementation Status

Last updated: 2026-06-15

## Completed in Step 1

- Created a Next.js App Router application with TypeScript, Tailwind CSS, and ESLint.
- Added strict TypeScript compiler options.
- Added Prettier configuration.
- Added branded FleetReady shell and placeholder routes.
- Added auth form shells using React Hook Form and Zod.
- Added reusable UI primitives.
- Added owner module boundaries for dashboard, fleet, maintenance, compliance, documents, reports, and settings.
- Added domain validation schemas.
- Added public and server environment validation.
- Added centralized application error handling.
- Added Supabase client factory boundaries.
- Added transactional email provider abstraction.
- Added product, architecture, database, and implementation documentation.

## Completed in Step 2

- Added Supabase Auth actions for sign up, login, logout, password reset request, and password reset completion.
- Added protected route middleware with onboarding redirects.
- Added company onboarding route and form.
- Added company-scoped PostgreSQL migration with required tables.
- Added RLS policies for tenant-owned tables.
- Added private Supabase Storage buckets and storage policies.
- Added meter-reading trigger to prevent silent meter rollback.
- Added development-only seed script.
- Added Vitest and tests for validation, tenant access, maintenance scheduling, auth redirects, and migration security.
- Updated documentation and environment variables.

## Completed in Step 3

- Added a responsive fleet asset list backed by Supabase.
- Added search, status/type filters, sorting, pagination, desktop table, and mobile card list for assets.
- Added asset create and edit routes with server-side validation and React Hook Form dirty-state handling.
- Added private asset image upload preparation using the `asset-images` bucket and company-scoped paths.
- Added asset profile route with overview, maintenance/compliance/document summaries, meter history, expense summary, notes, and archive action.
- Added mileage and engine-hour reading capture through a secure database RPC.
- Added explicit correction handling for meter readings that reduce current mileage or hours.
- Added reusable UI primitives for page headers, breadcrumbs, status badges, empty states, form controls, upload areas, tables, mobile card lists, skeleton loading, error messages, toast region, pagination, and confirmation submits.
- Enhanced the authenticated app shell with current company context, owner profile menu, prepared global search, and prepared notification indicator.
- Added Step 3 migration for flexible asset types and secure meter-reading insertion.
- Updated the development seed to use owner-facing asset type labels.
- Added tests for asset validation, create/edit/archive payloads, tenant filtering helpers, meter update logic, invalid decreases, responsive fleet UI structure, and the Step 3 migration.

## Completed in Step 4

- Added system preventive maintenance templates in a migration.
- Added centralized, deterministic maintenance status calculations for current, due-soon, and overdue states.
- Added timezone-aware calendar status behavior based on the company preferred timezone.
- Added maintenance overview with active rules, search, asset/type/status filters, urgency sorting, desktop table, mobile cards, and status counts.
- Added maintenance rule creation from templates or custom owner rule names.
- Added completed maintenance entry with parts/labor/other costs, automatically displayed total cost, optional rule selection, and attachment upload preparation.
- Added transactional completion RPC that inserts the maintenance record, advances the related rule, and stores attachment metadata together.
- Added maintenance history with search, asset/type/date/cost filters, secure attachment links, detail view, correction edit flow, and archive confirmation.
- Added maintenance cost summaries for total, parts, labor, other, by asset, and by maintenance category.
- Added asset-profile maintenance integration for current status, next due items, overdue items, recent completed maintenance, and maintenance-cost summary.
- Added tests for maintenance status calculations, combined intervals, due-soon thresholds, timezone behavior, completion payloads, cost summaries, migration expectations, and responsive maintenance UI.

## Completed in Step 5

- Added assigned compliance requirements so required asset categories can show a missing status before a record exists.
- Added centralized compliance status calculations for current, expiring soon, expired, missing, archived, urgency ordering, reminder windows, and company-timezone boundaries.
- Added compliance overview, counts, search, filters, expiration sorting, desktop table, mobile cards, empty states, add record, edit record, detail, archive, and assign requirement routes.
- Added optional compliance document attachment with private upload, declared MIME and detected file-signature validation, company-scoped non-guessable paths, transactional metadata creation, and cleanup on failure.
- Added document metadata support for owner-facing document types and stored bucket IDs.
- Added document library upload, preview, secure download, replacement, archive, search, category/asset/status filters, expiration sorting, expiring-document view, archived-document view, desktop table, and mobile cards.
- Linked maintenance receipts and invoices through the shared document metadata model so one file can appear in maintenance history, asset documents, and the global library.
- Added asset-profile compliance status, upcoming expirations, expired items, missing assigned requirements, recent documents, document category counts, and secure document links.
- Added Step 5 migration for compliance requirements, document bucket metadata, document storage constraints, compliance archive support, and compliance record/document RPC.
- Updated the development seed with fictional compliance requirements, compliance records, and metadata-only documents.
- Added tests for compliance status calculations, document upload validation, company-scoped storage paths, document metadata helpers, compliance helpers, static UI structure, and migration security.

## Completed in Step 6

- Added the live owner dashboard with summary counts, prioritized attention items, fleet status, and recent maintenance, document, compliance, and meter-reading activity.
- Added company-scoped in-app notifications with unread counts, individual read actions, mark-all-read, stable active keys, stale notification resolution, and duplicate active notification prevention.
- Added notification preferences for email enablement, maintenance/compliance/document thresholds, weekly summary enablement, and preferred summary day.
- Added reminder email templates and a Resend transactional provider implementation while preserving `EMAIL_PROVIDER=none` for local and test environments.
- Added the secure `/api/cron/reminders` endpoint prepared for a future scheduler and protected by `CRON_SECRET`.
- Added owner-facing reports for maintenance, compliance, documents, and asset history with filters, CSV exports, print-friendly views, and bounded server queries.
- Added Step 6 migration for `notification_preferences`, notification severity/link/resolution/email-attempt fields, active notification uniqueness, and dashboard/report indexes.
- Added tests for dashboard attention priority, notification sync planning, cron authorization, CSV escaping, report filter parsing, and Step 6 migration expectations.
- Updated environment, architecture, database, scheduled job, notification, and README documentation.

## Completed in Step 7 Doable Scope

- Added saved report defaults with company-scoped `report_preferences` and a `/reports` save-defaults control.
- Added compact report chart summaries for maintenance costs by asset, maintenance costs by category, and documents by category.
- Added advanced notification delivery preferences for warning emails, critical emails, and company-timezone quiet hours.
- Added notification analytics cards on `/settings` for active, unread, critical, and failed-email counts.
- Added document version-history metadata through `document_versions`, recorded upload/replacement versions, preserved previous storage objects on replacement, and exposed version history on document detail.
- Added owner-scoped audit event foundation and non-blocking audit logging for report preferences, notification preferences, and document actions.
- Added GitHub Actions CI for install, lint, type checking, tests, and production build.
- Added Step 7 migration for report preferences, notification preference delivery controls, document versions, and audit events.
- Added tests for saved report defaults, notification email eligibility, quiet hours, and Step 7 migration expectations.

## Completed in Subscription and Frontend Readiness Step

- Added packaged IBM Plex Sans typography and refined centralized light-mode color/status tokens.
- Improved the authenticated shell with an actual fleet search form, clearer owner/company context, and tokenized surfaces.
- Reworked Settings into structured company, owner, measurement/defaults, account security, subscription/billing, and notification sections.
- Added responsive report mobile cards so report data is not forced into desktop tables on phones.
- Added subscription plans for Starter, Small Fleet, and Growing Fleet with active-asset limits of 5, 15, and 30.
- Added Stripe Checkout server action, Stripe Billing Portal server action, verified webhook route, and idempotent `stripe_events` persistence.
- Added webhook handling for checkout completion, subscription creation/update/deletion, successful invoice payment, and failed invoice payment.
- Added subscription-state helpers for full-access, read-only, billing-access, report-export, upload, edit, and asset-create capabilities.
- Added server-action active-asset limit checks for asset creation and reactivation.
- Added database-level active-asset limit enforcement through `public.enforce_active_asset_limit()` so direct authenticated Supabase writes cannot bypass the limit.
- Updated onboarding and development seed behavior to create Starter trial subscription records.
- Added tests for subscription access rules, Stripe webhook static behavior, Stripe event persistence, and active-asset limit migration expectations.
- Added `docs/design-system.md` and `docs/launch-checklist.md`.

## Completed in Development Demo Data Step

- Added a comprehensive development-only demo seed data module with stable fictional identifiers and relative dates.
- Added automatic read-only local demo data for populated owner screens when Supabase is not configured.
- Added full, reset, minimal, and empty seed commands.
- Added production safeguards requiring development intent and reset confirmation.
- Added one fictional owner company, 15 varied assets, meter readings, maintenance rules, completed maintenance records, compliance requirements and records, document metadata, document versions, notifications, audit events, report preferences, notification preferences, and internal subscription state.
- Added optional generated demo PDF/PNG uploads with metadata-only fallback.
- Added tests for demo dataset integrity, idempotent IDs, meter consistency, maintenance/compliance/document status coverage, notification references, subscription fixtures, reset scoping, and production guards.
- Added `docs/demo-data.md`.

## Completed in Rate Limiting and Abuse Protection Step

- Added Upstash Redis and `@upstash/ratelimit` dependencies for serverless-friendly production rate limiting.
- Added centralized typed sliding-window policies, hashed key construction, standard 429 responses, and server-action enforcement helpers.
- Added production fail-closed behavior when Redis or the rate-limit key salt is missing, while preserving local/demo fail-open behavior in development and test.
- Added limits for login, password reset, authenticated API work, dashboard/report operations, owner mutations, document uploads, reminder triggers, and public health checks.
- Added `/api/health` with IP-scoped rate limiting.
- Added rate limits to auth actions, report export, dashboard/report queries, owner mutations, uploads, notification/report settings, onboarding completion, billing actions, and scheduled reminder processing.
- Tightened upload validation with server-side extension checks, shared signature validation, randomized storage names, and a per-fleet storage quota hook.
- Added tests for rate-limit allowed/blocked behavior, `Retry-After` headers, tenant separation, hashed auth keys, trusted proxy handling, generic auth messages, and upload extension rejection.
- Added `docs/rate-limiting.md` and updated README, architecture, storage-security, and scheduled-job documentation.

## Completed in P1 Legal and Account Controls Step

- Added public `/privacy`, `/terms`, and `/support` routes.
- Added configurable `SUPPORT_EMAIL` handling with safe missing-configuration behavior.
- Added legal/support links to the landing footer, auth pages, owner profile/help menus, and Settings.
- Added signup notice linking Terms and Privacy without introducing consent storage.
- Added Account and Data settings section with data export, support/legal links, deletion request status, and deliberate deletion request form.
- Added versioned owner JSON data export at `/settings/export`, scoped to the authenticated owner company.
- Added export manifest that documents uploaded files are metadata-only and excludes secrets, webhook payloads, signed URLs, internal diagnostics, and other-company records.
- Added account/company deletion request service boundary with exact company-name confirmation, duplicate active-request protection, safe server-action errors, and local demo behavior.
- Added `account_deletion_requests` migration with RLS, owner insert/select policies, status enum, active-request uniqueness, and internal failure reason field.
- Added audit events for export requested/completed and deletion requested/confirmed.
- Added tests for export filtering, deletion helpers, legal/support route coverage, missing support config, auth/landing links, and the account deletion migration.
- Added `docs/legal-account-controls.md`.

## Still Deferred Beyond Current Local Scope

- Live Supabase integration tests in CI.
- Hard per-fleet storage quota enforcement after plan-specific storage allowances are defined.
- App-owned email verification resend endpoint protection; no such endpoint exists today.
- Reliable PDF generation.
- Document OCR, extracted fields, and bulk import.
- Production observability dashboards, alerting, and audit review UI.
- Automated processing of confirmed account deletion requests.
- Final legal counsel review of privacy and terms content.
- Verified production support mailbox and escalation process.
- Stripe product/price creation or reuse verification after Stripe connector re-authentication.
- End-to-end Stripe Checkout/Portal testing against a configured Stripe test account.
- Production deployment, domain configuration, scheduler configuration, and Vercel setup.

## Verification Targets

- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
