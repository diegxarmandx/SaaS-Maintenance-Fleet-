# Database Plan

## Tenancy Model

FleetReady is company-scoped and owner-only. Supabase Auth identifies the owner, `profiles.company_id` identifies the tenant, and Row Level Security restricts every tenant-owned table to `public.is_member_of_company(company_id)`.

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
- `notifications`
- `subscription_records`

## Security Functions

- `public.current_company_id()`
- `public.is_member_of_company(company_uuid uuid)`
- `public.handle_new_auth_user()`
- `public.complete_company_onboarding(...)`
- `public.apply_meter_reading_to_asset()`
- `public.create_meter_reading_for_asset(...)`
- `public.complete_maintenance_and_update_rule(...)`
- `public.create_compliance_record_with_document(...)`

`complete_company_onboarding` is a security-definer RPC used to create the company, complete the profile, and create the initial internal subscription record after Supabase Auth sign-up.

## Constraints

- UUID primary keys use `gen_random_uuid()`.
- Foreign keys connect every child table to `companies` and relevant parent records.
- Money values use `numeric(12, 2)`.
- Mileage and hour values use `numeric(14, 2)`.
- Negative mileage, hours, file sizes, asset limits, and costs are rejected.
- `maintenance_records.total_cost` is a generated column from parts, labor, and other costs.
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
- Document metadata stores the source bucket and checks that `storage_path` begins with the company UUID.
- Subscription records are unique per company.

## Indexes

Indexes cover:

- `company_id`
- `asset_id`
- meter reading timelines
- compliance and document expiration dates
- maintenance due dates, due mileage, due hours, and completion dates
- notification due/read/email status
- Stripe placeholder identifiers

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
- `notifications`
- `subscription_records`

Authenticated owners can access only rows where their completed profile belongs to the row's company. System maintenance templates use `company_id is null` and are readable, but only company-owned templates can be mutated by owners.

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
- HEIC is intentionally not enabled in Step 5

## Development Seed

Run:

```bash
npm run db:seed
```

The seed script creates one fictional owner, one fictional company, several assets, readings, maintenance rules and records, compliance records, and metadata-only documents. It never runs automatically and refuses production environments.
