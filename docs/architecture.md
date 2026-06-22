# Architecture

## Stack

- Next.js App Router
- TypeScript with strict compiler settings
- Tailwind CSS 4
- Custom accessible UI primitives comparable to shadcn-style composition
- Zod validation
- React Hook Form for forms
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- Upstash Redis and `@upstash/ratelimit` for production rate limiting
- Deployment-ready project layout, with no deployment performed in this step
- Stripe SDK for test-mode Checkout, Billing Portal, and verified webhook processing
- Transactional email provider abstraction for reminders, with local disabled mode

## Source Structure

- `src/app`: App Router routes, route groups, loading states, and error boundaries
- `src/proxy.ts`: Supabase session check and route redirects
- `src/components/app-shell`: Owner workspace shell and navigation
- `src/components/ui`: Reusable UI primitives, including page headers, breadcrumbs, status badges, empty states, form controls, upload areas, tables, mobile card lists, skeletons, error messages, toast region, pagination, and confirmation submit controls
- `src/features/auth`: Auth validation, actions, forms, and redirect rules
- `src/features/onboarding`: Company onboarding validation, action, and form
- `src/features/billing`: Subscription plans, access-state helpers, Stripe actions, verified webhook processing, and billing UI
- `src/features/dashboard`: Owner dashboard boundary with server aggregates, attention ordering, and dashboard UI
- `src/features/fleet`: Fleet asset boundary with constants, validation, pure helpers, server queries/actions, responsive list UI, asset forms, asset profile, and meter-reading form
- `src/features/maintenance`: Preventive maintenance boundary with status calculations, rule forms, completed record entry, history, cost summaries, attachment handling, and server actions/queries
- `src/features/inbox`: Maintly Inbox boundary for maintenance invoice/receipt/photo upload, server-side AI extraction, owner review, document-only save, discard, and audit status tracking
- `src/features/compliance`: Compliance boundary with assigned requirements, status calculations, record forms, attachment handling, server actions/queries, and responsive overview/detail UI
- `src/features/documents`: Document boundary with file validation, document library UI, relationship handling, signed URL helpers, document version history, and server actions/queries
- `src/features/notifications`: In-app notification, reminder generation, email template, cron auth, and preference logic
- `src/features/reports`: Reporting boundary with server queries, saved defaults, chart summaries, CSV export helpers, and report UI
- `src/features/settings`: Settings boundary with notification preferences and notification analytics; subscription billing UI is supplied by `src/features/billing`
- `src/features/legal`: Public privacy, terms, support content, and support contact handling
- `src/features/account-data`: Owner data export, account/company deletion request helpers, and Settings UI
- `src/server/audit`: Non-blocking audit event recording for important owner actions
- `src/lib/env`: Environment schemas and parsed config
- `src/lib/supabase`: Browser and server Supabase client factories
- `src/lib/email`: Transactional email provider contract
- `src/lib/rate-limit`: Centralized Redis-backed sliding-window rate-limit policies, key construction, standard 429 responses, and server-action helpers
- `src/server/db`: Server-side privileged Supabase access boundary
- `src/server/tenant`: Tenant ownership helpers
- `src/validation`: Domain validation schemas
- `supabase/migrations`: PostgreSQL and Storage migrations
- `scripts`: Development-only operational scripts
- `__tests__`: Unit and static migration security tests

## Authentication Flow

1. Owner signs up with email, password, and owner name.
2. Supabase Auth creates the user.
3. The database trigger creates an incomplete `profiles` row.
4. Middleware redirects incomplete authenticated owners to `/onboarding`.
5. Onboarding calls `complete_company_onboarding`.
6. The RPC creates the company, links the owner profile, and creates the internal Starter trial subscription record.
7. Completed owners can access protected application routes.

The app also supports login, logout, password-reset request, and password-reset completion.

Login and password-reset request actions are rate limited before Supabase Auth calls. Owner-facing auth failure messages remain generic and do not reveal whether an email exists. Password reset completion is handled through the authenticated Supabase reset session in the client form.

## Tenant Security

Frontend checks are not trusted for tenant isolation. Tenant enforcement is implemented in PostgreSQL with RLS and helper functions. Every tenant-owned table is company-scoped, and Storage paths must begin with the company UUID.

The service-role key is used only by server-side helpers and the development seed script. It is never exposed to browser components.

Owner data export and account deletion request actions also use the server-side owner context. The browser never supplies a company ID for those actions. Exports are whitelisted by field and company-scoped before serialization. Account deletion requests are recorded in a tenant table with RLS enabled and forced.

## Legal, Support, and Account Data Controls

Public `/privacy`, `/terms`, and `/support` routes provide launch-readiness legal/support surfaces. The legal copy is a draft and requires attorney review before production launch.

Settings includes an Account and Data section:

- `/settings/export` returns a versioned JSON export for the authenticated owner company.
- Uploaded file contents are not embedded in the export; document and file metadata are included.
- Export audit events are recorded for requested/completed states without logging exported content.
- Deletion requests require typing the company name and are recorded as `confirmed`.
- An operations workflow handles deletion processing; the app does not claim data is deleted until processing marks the request completed.

See `docs/legal-account-controls.md` for retention, retries, support configuration, and launch review notes.

## Abuse Protection

Rate limiting is centralized in `src/lib/rate-limit` and uses Upstash Redis in production. Policies use sliding windows and hashed key segments. Normalized emails are only used for auth-related limits and are hashed before key construction. Authenticated owner limits include the owner ID and, where available, the fleet company ID.

Protected surfaces include auth actions, `/api/health`, `/api/cron/reminders`, `/reports/export`, dashboard/report query entry points, owner mutations, uploads, onboarding completion, notification/report settings, and billing entry actions. Missing Redis configuration fails closed in production and fails open in development/test to keep the local demo usable.

See `docs/rate-limiting.md` for exact limits and deployment configuration.

## UI Approach

The app remains a quiet operational SaaS interface. It avoids role management, dispatching, driver workflows, work orders, repair-shop scheduling, and other excluded product areas.

The authenticated shell uses a desktop sidebar, mobile navigation, current company context, owner profile menu, fleet asset search, and active notification menu. The company area represents one current owner company.

Statuses use text plus Lucide icons, not color alone. The current shared status vocabulary is:

- Current
- Due soon
- Expiring soon
- Overdue
- Expired
- Missing
- Archived
- Active
- Past due
- Canceled
- Read-only

Fleet asset and report screens use desktop tables and mobile card lists so small-screen owners are not forced into horizontal data tables.

## Subscription Billing

Subscription billing is based on active assets, not user seats. The initial configured plan keys are:

- `starter`: up to 5 active assets
- `small_fleet`: up to 15 active assets
- `growing_fleet`: up to 30 active assets

Stripe price IDs are environment variables. The code does not hard-code live prices and does not create live-mode products.

Checkout is started from a server action after owner and company context are verified. Billing Portal access is also server initiated and requires an existing Stripe customer ID. Checkout success redirects are treated as informational only. The verified `/api/stripe/webhook` route uses Stripe signature verification and then persists event IDs in `stripe_events` before processing, so duplicate webhooks are idempotent.

Webhook processing syncs `subscription_records` and `companies` for checkout completion, subscription create/update/delete, and successful or failed invoice payment. Server code uses the service-role Supabase client. Event payload storage keeps only the fields Maintly needs for idempotency and troubleshooting.

Subscription-state behavior:

- `trial`, `trialing`, and `active`: full application access, record editing, uploads, exports, and new active assets while under the plan limit.
- `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, and `paused`: read-only application access with billing access preserved. Report exports remain available so owners can retain access to their own records.
- Accounts above a downgraded active-asset limit can view existing records and access billing. Creating or reactivating another active asset is blocked until the owner archives assets or upgrades.

Active-asset limits are enforced in two places: Next.js server actions provide owner-friendly validation messages, and `public.enforce_active_asset_limit()` blocks direct authenticated Supabase writes that would bypass the UI.

## Dashboard, Notifications, and Reports

Steps 6 and 7 implement the owner command center without introducing any additional operational user roles.

- `/dashboard` shows active asset count, due-soon and overdue maintenance counts, expiring and expired document counts, missing compliance counts, a prioritized attention list, fleet status by asset, and recent maintenance, document, compliance, and meter-reading activity.
- Dashboard attention order is deterministic: expired/overdue first, missing second, due-soon/expiring third.
- Notifications are company-scoped database rows. Reminder processing creates or updates active notifications by stable `notification_key`, resolves stale notifications, and prevents duplicate active reminders through a partial unique index.
- The notification menu supports unread counts, individual mark-read actions, and mark-all-read actions.
- `/settings` exposes sectioned company, owner, measurement, security, subscription, billing, notification analytics, and notification preference surfaces.
- `/settings` also exposes legal/support links, owner data export, deletion request status, and the deliberate deletion request confirmation form.
- `/api/cron/reminders` is a secure server-only endpoint prepared for a future scheduler. It requires `CRON_SECRET`, uses the service-role client only on the server, and logs counts without PII or secrets.
- Reminder email templates cover maintenance due/overdue, compliance expiring/expired/missing, document expiring/expired, and weekly summary. Local development can keep `EMAIL_PROVIDER=none`.
- `/reports` provides owner-filtered maintenance, compliance, document, and asset-history reports with saved defaults, compact chart summaries, CSV exports, and print-friendly views.
- CSV exports are generated server-side from the current owner company, include company and generated date metadata, escape spreadsheet-dangerous values, and omit internal UUIDs.

## Fleet Asset Slice

Step 3 implements real Supabase-backed asset CRUD while preserving database RLS as the tenant boundary:

- `/fleet` lists owner-company assets with search, status/type filters, sorting, pagination, desktop table, and mobile cards.
- `/fleet/new` creates an asset with server-side validation and optional private image upload.
- `/fleet/[assetId]` shows asset overview, maintenance/compliance/document summaries, meter history, expense summary, notes, archive action, and a meter-reading form.
- `/fleet/[assetId]/edit` updates asset details and can replace the asset image.

Asset writes use server actions. Browser code never receives a Supabase service-role key. Asset image uploads use the authenticated owner session and private Storage policies requiring the first path segment to match the owner company UUID.

Meter readings are created through `public.create_meter_reading_for_asset(...)`, which resolves the owner company from `auth.uid()`, verifies the asset belongs to that company, inserts the reading, and lets the existing trigger update current mileage or hours transactionally. Decreasing readings require the explicit correction flag and a note.

## Maintenance Slice

Step 4 implements owner-managed preventive maintenance without adding repair-shop management workflows.

- `/maintenance` lists active maintenance rules with search, asset/type/status filters, urgency sorting, desktop table, mobile cards, current/due-soon/overdue counts, history filters, and cost summaries.
- `/maintenance/rules/new` creates owner maintenance rules from system templates or custom rule names.
- `/maintenance/complete` records completed maintenance, optional receipt or invoice attachment metadata, tax cost, and advances a related rule when selected.
- `/maintenance/history/[recordId]` displays completed maintenance detail, costs, and secure attachment download.
- `/maintenance/history/[recordId]/edit` supports correction edits while preserving the historical record identity.

Maintenance status is calculated from source values, not stored permanently:

- `Overdue` wins when any enabled interval has passed.
- `Due soon` wins when any enabled reminder threshold has been reached and no interval is overdue.
- `Current` applies when all enabled intervals remain outside reminder thresholds.

Date calculations use the company configured timezone via the centralized maintenance schedule service. Mileage and engine-hour calculations use the asset's current meter values.

Completed maintenance uses `public.complete_maintenance_and_update_rule(...)`, a security-definer RPC that resolves the owner company from `auth.uid()`, verifies asset/rule ownership, inserts the historical record including parts/labor/other/tax costs, updates the related rule's last completed and next due values, and inserts optional attachment metadata in one database transaction.

Attachments use the private `maintenance-attachments` bucket. Server actions validate file type and size, use company-scoped non-guessable paths, and create signed URLs for preview/download. The browser never receives storage service credentials.

## Asset Inbox Slice

Asset Inbox is an owner-reviewed paperwork workflow scoped to a known fleet asset.

- `/fleet/[assetId]?section=inbox` lists that asset's Pending Review, Completed, and Needs Attention items.
- `/fleet/[assetId]/upload` uploads one private PDF or image under `{company_id}/assets/{asset_id}/inbox/{job_id}/...`.
- `/fleet/[assetId]/inbox/[jobId]` previews the private file, shows editable extraction fields, and can create a new maintenance record, compliance record, or general document after owner confirmation.

The AI adapter is server-only and receives the already-authorized asset context. The browser never receives `OPENAI_API_KEY`, private storage credentials, or public document URLs. If extraction is unavailable, the item becomes Needs Attention and remains editable.

Final writes pass through owner authentication, company and asset ownership checks, Zod validation, meter-decrease confirmation, and transaction-backed database functions. There is no global Inbox, QR-code flow, public upload surface, or email forwarding.

## Compliance Slice

Step 5 implements owner-managed compliance tracking without implying that Maintly submits, renews, or guarantees legal compliance.

- `/compliance` lists compliance records and assigned requirements with search, asset/type/status filters, expiration sorting, desktop table, mobile cards, and current/expiring/expired/missing/archived counts.
- `/compliance/requirements/new` assigns a required compliance category to an asset so missing records become visible.
- `/compliance/new` creates a compliance record and can attach one supporting document.
- `/compliance/[recordId]` shows status, expiration, issuer, policy or identification number, notes, and secure document access.
- `/compliance/[recordId]/edit` supports owner corrections and optional document replacement.

Compliance statuses are calculated centrally from source values:

- `Expired` applies when the expiration date is before the current date in the company timezone.
- `Expiring soon` applies when the expiration date is inside the configured reminder period.
- `Missing` applies when an assigned required category has no active record or document evidence.
- `Current` applies when evidence exists outside the reminder window.
- `Archived` is shown for archived records.

The compliance completion RPC verifies `auth.uid()`, resolves `public.current_company_id()`, verifies the asset and optional assigned requirement, inserts the record, and inserts optional document metadata in one transaction after the file upload succeeds. If the transaction fails, the server action removes the uploaded object.

## Documents Slice

Step 5 implements a private owner document library.

- `/documents` lists documents with search, category/asset/status filters, date/name sorting, desktop table, mobile cards, expiring-document view, archived-document view, and empty states.
- `/documents/upload` uploads a private file and links it to an asset, maintenance record, compliance record, or general fleet library.
- `/documents/[documentId]` displays metadata, supported preview, and secure download.
- `/documents/[documentId]/edit` updates metadata or replaces the private file while keeping the document record.

Document metadata stores both a broad domain category and the exact owner-facing `document_type`. The database also stores `storage_bucket`, so signed URL generation does not guess which bucket contains a file.

Supported uploads are PDF, JPEG, and PNG. Server actions validate declared MIME type, detected file signature, size, owner relationships, company-scoped paths, and private bucket placement. Replacements create `document_versions` records and preserve previous storage objects as history. The app leaves HEIC out until the platform can process it with enough consistency.

## Testing Strategy

Unit tests cover:

- Validation schemas
- Tenant ownership helpers
- Maintenance interval calculations
- Authentication redirect rules
- Static migration checks for required tables, RLS, constraints, meter trigger, and Storage policies
- Fleet asset validation and create/edit/archive payloads
- Tenant filtering helpers
- Mileage and engine-hour update calculations and correction rejection
- Responsive fleet list structure
- Maintenance status calculations for date, mileage, hours, combined intervals, reminder thresholds, and timezone behavior
- Completed maintenance cost calculations and cost summaries, including tax cost
- Maintly Inbox extraction normalization, asset matching, meter-decrease warnings, cost mismatch warnings, and RLS migration checks
- Static migration checks for the maintenance transaction RPC, seeded system templates, attachment metadata ownership, and archive behavior
- Responsive maintenance UI structure and asset-profile maintenance integration
- Compliance status calculations for expiration, reminder windows, missing requirements, archived state, urgency, and timezone boundaries
- Document upload validation for declared and detected file information
- Document metadata, category mapping, and company-scoped storage path helpers
- Static migration checks for compliance requirements, RLS, compliance RPC, document bucket metadata, and storage path constraints
- Responsive compliance and document UI structure
- Dashboard attention priority
- Notification sync planning and cron authorization
- CSV escaping, report filter parsing, and saved report default behavior
- Static migration checks for notification preferences, active notification uniqueness, and email attempt tracking
- Notification delivery eligibility and quiet-hour calculations
- Static migration checks for report preferences, document versions, and audit event policies
- Subscription access-state calculations
- Static migration checks for Stripe event persistence, subscription state columns, and active-asset limit triggers
- Static webhook checks for Stripe signature verification, idempotent event handling, and covered billing events
- Owner data export filtering, manifest, and safe filename behavior
- Account deletion confirmation and status transition helpers
- Static checks for legal/support routes, settings/menu links, and the account deletion migration

GitHub Actions runs install, lint, type checking, tests, and production build. Live Supabase integration tests are deferred until a project URL and service credentials are configured in CI.

## Deferred Integrations

- Reliable PDF generation
- Broad document OCR, batch import, and non-maintenance ingestion types
- Live Supabase integration-test execution
- Stripe product/price creation or reuse confirmation after the Stripe connector is re-authenticated
- Production deployment, domain configuration, scheduler configuration, and observability service wiring
- Automated account deletion processing worker or operations tooling
