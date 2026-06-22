# Database Plan

## Tenancy Model

Maintly is company-scoped and owner-only. Supabase Auth identifies the owner, `profiles.company_id` identifies the tenant, and Row Level Security restricts every tenant-owned table to `public.is_member_of_company(company_id)`.

Profiles can exist with `company_id = null` while onboarding is incomplete. Once onboarding is complete, the owner is linked to one company.

## Migration

The Step 2 migration is:

- `supabase/migrations/20260610190000_owner_tenant_security_foundation.sql`

It creates extensions, enums, tables, constraints, indexes, helper functions, triggers, RLS policies, and Storage buckets/policies.

The Step 3 migration is:

- `supabase/migrations/20260610210000_fleet_asset_management.sql`

It changes `assets.asset_type` from the original broad enum to constrained text so owner-facing defaults such as Truck, Van, Car, Trailer, Excavator, Backhoe, Loader, Generator, and Other equipment can be stored while still allowing future custom asset types. It also adds `public.create_meter_reading_for_asset(...)`, an authenticated security-definer RPC that creates company-scoped meter readings for assets owned by the current owner company.

The Step 4 migration is:

- `supabase/migrations/20260610230000_preventive_maintenance_module.sql`

It adds archive support for completed maintenance records, seeds system preventive maintenance templates, and creates `public.complete_maintenance_and_update_rule(...)` for transactional completed-maintenance entry and rule advancement.

The Step 5 migration is:

- `supabase/migrations/20260611170000_compliance_and_documents_module.sql`

It adds assigned compliance requirements, compliance archive support, document type and storage bucket metadata, document path constraints, compliance/document indexes, and `public.create_compliance_record_with_document(...)` for transactional compliance record and document metadata creation.

The Step 6 migration is:

- `supabase/migrations/20260611190000_dashboard_notifications_reports.sql`

It adds owner notification preferences, extends notifications with idempotent active keys, links, severity, resolution, generated timestamps, email attempt tracking, and metadata, and adds indexes used by dashboard, reminder, and report queries.

The Step 7 local-foundation migration is:

- `supabase/migrations/20260611210000_step7_reporting_notifications_documents.sql`

It adds saved report preferences, advanced notification delivery columns, document version history, and owner-scoped audit events.

The subscription billing and active-asset limit migration is:

- `supabase/migrations/20260612120000_subscription_billing_and_limits.sql`

It extends subscription statuses, adds plan and Stripe sync columns to `subscription_records`, creates the idempotent `stripe_events` table, updates onboarding to create a Starter trial record, and adds the database trigger that prevents creating or reactivating active assets above the current plan limit or while subscription access is restricted.

The legal/account-controls migration is:

- `supabase/migrations/20260615120000_account_legal_controls.sql`

It adds the `account_deletion_status` enum and `account_deletion_requests` table for owner-requested account/company deletion. The table records owner ID, company ID, request/confirmation/processing/completion/failure/cancellation timestamps, status, a confirmation hash, and an internal failure reason field.

The Maintly Inbox migration is:

- `supabase/migrations/20260617120000_fleetready_inbox_ingestion.sql`
- `supabase/migrations/20260620120000_asset_inbox.sql`

The first migration adds tax-aware maintenance totals and owner-scoped ingestion audit tables. The Asset Inbox migration requires asset-scoped uploads, adds Needs Attention and completion metadata, and provides transaction-backed maintenance, compliance, and document completion functions.

## Tables

- `profiles`
- `companies`
- `assets`
- `meter_readings`
- `maintenance_templates`
- `maintenance_rules`
- `maintenance_records`
- `compliance_requirements`
- `compliance_records`
- `documents`
- `document_versions`
- `notifications`
- `notification_preferences`
- `report_preferences`
- `audit_events`
- `subscription_records`
- `stripe_events`
- `account_deletion_requests`
- `ingestion_jobs`
- `ingestion_job_events`

## Security Functions

- `public.current_company_id()`
- `public.is_member_of_company(company_uuid uuid)`
- `public.handle_new_auth_user()`
- `public.complete_company_onboarding(...)`
- `public.apply_meter_reading_to_asset()`
- `public.create_meter_reading_for_asset(...)`
- `public.complete_maintenance_and_update_rule(...)`
- `public.create_compliance_record_with_document(...)`
- `public.enforce_active_asset_limit()`

`complete_company_onboarding` is a security-definer RPC used to create the company, complete the profile, and create the initial internal Starter trial subscription record after Supabase Auth sign-up.

## Constraints

- UUID primary keys use `gen_random_uuid()`.
- Foreign keys connect every child table to `companies` and relevant parent records.
- Money values use `numeric(12, 2)`.
- Mileage and hour values use `numeric(14, 2)`.
- Negative mileage, hours, file sizes, asset limits, and costs are rejected.
- `maintenance_records.total_cost` is a generated column from parts, labor, other, and tax costs.
- Meter readings update the asset meter through a trigger.
- A lower meter reading requires `is_correction = true` and a note.
- The Step 3 meter-reading RPC verifies the authenticated owner company before inserting a reading.
- The Step 4 maintenance completion RPC verifies the authenticated owner company, asset, and optional rule before inserting the record and advancing next due values.
- The Step 5 compliance RPC verifies the authenticated owner company, asset, optional assigned requirement, and company-scoped document path before inserting the compliance record and optional document metadata.
- Completed maintenance records can be archived with `archived_at`; the app does not expose destructive delete as the default owner workflow.
- Compliance records and assigned requirements can be archived with `archived_at`; the app does not expose destructive delete as the default owner workflow.
- Active asset unit numbers are unique per company.
- Active compliance requirements are unique per company, asset, and case-insensitive compliance type.
- Storage paths are unique per company.
- Active notifications are unique per company and notification key while unresolved, preventing duplicate active reminders.
- Notification email attempt counts cannot be negative.
- Notification preferences are unique per company and restrict weekly summary day to 0 through 6.
- Notification quiet hours must either include both start and end times or neither.
- Report preferences are unique per company and limit default lookback windows to 0 through 3650 days.
- Document metadata stores the source bucket and checks that `storage_path` begins with the company UUID.
- Document versions preserve company-scoped storage paths and unique version numbers per document.
- Audit events require nonblank event and entity types and are append-only from the app policy perspective.
- Subscription records are unique per company.
- Subscription plan keys are restricted to `starter`, `small_fleet`, and `growing_fleet`.
- Stripe event IDs are unique and processed idempotently.
- New or reactivated active assets are blocked when the current subscription is not `trial`, `trialing`, or `active`.
- New or reactivated active assets are blocked when active, non-archived asset count is already at the current plan limit.
- Account deletion requests use documented statuses: `requested`, `confirmed`, `processing`, `completed`, `failed`, and `canceled`.
- Only one active deletion request (`requested`, `confirmed`, or `processing`) is allowed per company.
- Confirmation text is stored as a SHA-256 hash, not raw typed confirmation text.

## Indexes

Indexes cover:

- `company_id`
- `asset_id`
- meter reading timelines
- compliance and document expiration dates
- maintenance due dates, due mileage, due hours, and completion dates
- notification due/read/email status
- notification active keys, resolution, unread state, and email retry scans
- notification preference company lookups
- report preference company lookups
- document version history by company and document
- audit event timelines by company and entity
- subscription status, plan key, and current period end
- Stripe customer, subscription, and event identifiers
- Account deletion request company, owner, status, and active-request uniqueness

## Row-Level Security

RLS is enabled and forced for every tenant-owned table:

- `profiles`
- `companies`
- `assets`
- `meter_readings`
- `maintenance_templates`
- `maintenance_rules`
- `maintenance_records`
- `compliance_requirements`
- `compliance_records`
- `documents`
- `document_versions`
- `notifications`
- `notification_preferences`
- `report_preferences`
- `audit_events`
- `subscription_records`
- `stripe_events`
- `account_deletion_requests`
- `ingestion_jobs`
- `ingestion_job_events`

Authenticated owners can access tenant rows only where their completed profile belongs to the row's company. System maintenance templates use `company_id is null` and are readable, but only company-owned templates can be mutated by owners.

`stripe_events` is deliberately different: it has RLS enabled and forced but no owner access policy. It is written by server-side service-role webhook processing only and stores a minimized event payload for idempotency and troubleshooting.

`account_deletion_requests` is owner-selectable and owner-insertable for the authenticated owner company. Authenticated owners do not receive update or delete policies; status processing is reserved for an operations/service-role boundary.

`ingestion_jobs` and `ingestion_job_events` are owner-selectable/mutable only for the authenticated owner and company. Storage paths are constrained to the company UUID prefix. These tables store extraction metadata, corrected review values, status transitions, provider/model metadata, and created-record references, but final maintenance records are still created only after owner confirmation.

## Storage

Private Supabase Storage buckets:

- `asset-images`
- `maintenance-attachments`
- `compliance-documents`
- `fleet-documents`

Each bucket has MIME type allow-lists and file size limits. Storage object policies require the first path segment to be the owner company UUID, for example:

```text
{company_id}/assets/t-101.webp
{company_id}/assets/{asset_id}/truck.webp
{company_id}/compliance/registration.pdf
```

The asset form validates images before upload:

- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Maximum size: 5 MB

Maintenance attachments use `maintenance-attachments` and are validated before upload:

- Allowed types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
- Maximum size: 10 MB
- Path shape: `{company_id}/maintenance/{maintenance_record_id}/{uuid}-{filename}`
- Asset Inbox draft path shape: `{company_id}/assets/{asset_id}/inbox/{ingestion_job_id}/{uuid}-{filename}`
- Attachment metadata is inserted into `documents` with `category = 'maintenance'` and the matching company, asset, and maintenance record IDs.

Compliance and fleet documents are validated before upload:

- Allowed types: `application/pdf`, `image/jpeg`, `image/png`
- Maximum size: configurable by `DOCUMENT_UPLOAD_MAX_SIZE_BYTES`, capped at 10 MB to match the private bucket limit
- Validation checks both declared MIME type and detected file signature
- Compliance path shape: `{company_id}/compliance/{compliance_record_id}/{uuid}-{filename}`
- Fleet library path shape: `{company_id}/{category}/{document_id}/{uuid}-{filename}`
- Metadata records the `storage_bucket`, `storage_path`, exact `document_type`, broad category, and optional asset, maintenance, or compliance relationship
- Signed URLs are created only after server-side owner-company metadata lookup
- If upload succeeds but metadata creation fails, the server action removes the uploaded object
- If file replacement succeeds but metadata update fails, the new object is removed and the existing file remains referenced
- Successful file replacement now records a new `document_versions` row and keeps previous storage objects available as history.
- HEIC stays disabled until the platform can process it with enough consistency.

## Development Seed

Run:

```bash
npm run db:seed
```

The seed script creates one fictional owner, one fictional company, several assets, readings, maintenance rules and records, compliance records, and metadata-only documents. It never runs automatically and refuses production environments.

## Reminder Processing

The scheduled reminder job uses server-only Supabase access. It computes current due and expiration conditions from maintenance rules, compliance records and requirements, documents, and company timezone preferences. It inserts new active notifications, updates still-active notifications, resolves stale notifications, and only attempts email for unresolved notifications that have not already been sent.

The scheduled endpoint must be protected by `CRON_SECRET`. A future scheduler can call `/api/cron/reminders` once the secret is configured, but no production schedule is committed in this step.

## Stripe Billing Persistence

Stripe sync uses:

- `subscription_records.stripe_customer_id`
- `subscription_records.stripe_subscription_id`
- `subscription_records.stripe_price_id`
- `subscription_records.plan_key`
- `subscription_records.status`
- `subscription_records.current_period_start`
- `subscription_records.current_period_end`
- `subscription_records.trial_end`
- `subscription_records.cancel_at_period_end`
- `subscription_records.asset_limit`
- `subscription_records.last_payment_status`
- `subscription_records.restricted_at`
- `subscription_records.updated_from_stripe_at`
- `stripe_events`

Verified Stripe webhooks are authoritative for subscription state. Checkout success redirects do not mark a subscription active.

## Deferred Database Work

- Reliable PDF exports.
- Broad document OCR, batch import, and non-maintenance ingestion types.
- Live Supabase integration-test execution in CI.
- Additional billing analytics beyond the operational Stripe sync fields.
- Account deletion processing worker/runbook that transitions confirmed requests through processing to completed, failed, or canceled.
