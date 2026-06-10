# Database Plan

## Tenancy Model

FleetReady is company-scoped and owner-only. Supabase Auth identifies the owner, `profiles.company_id` identifies the tenant, and Row Level Security restricts every tenant-owned table to `public.is_member_of_company(company_id)`.

Profiles can exist with `company_id = null` while onboarding is incomplete. Once onboarding is complete, the owner is linked to one company.

## Migration

The Step 2 migration is:

- `supabase/migrations/20260610190000_owner_tenant_security_foundation.sql`

It creates extensions, enums, tables, constraints, indexes, helper functions, triggers, RLS policies, and Storage buckets/policies.

## Tables

- `profiles`
- `companies`
- `assets`
- `meter_readings`
- `maintenance_templates`
- `maintenance_rules`
- `maintenance_records`
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
- Active asset unit numbers are unique per company.
- Storage paths are unique per company.
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
{company_id}/compliance/registration.pdf
```

## Development Seed

Run:

```bash
npm run db:seed
```

The seed script creates one fictional owner, one fictional company, several assets, readings, maintenance rules and records, compliance records, and metadata-only documents. It never runs automatically and refuses production environments.
