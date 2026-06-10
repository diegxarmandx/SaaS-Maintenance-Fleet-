# Database Plan

## Tenancy Model

Every operational record belongs to a single fleet owner. Supabase Auth should provide the owner identity, and PostgreSQL Row Level Security should restrict all owner data to `auth.uid()`.

## Planned Tables

### `owner_profiles`

- `id uuid primary key references auth.users(id)`
- `display_name text not null`
- `workspace_name text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `fleet_assets`

- `id uuid primary key`
- `owner_id uuid not null references owner_profiles(id)`
- `type text not null`
- `name text not null`
- `vin_or_serial_number text`
- `license_plate text`
- `year integer`
- `make text`
- `model text`
- `status text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `meter_readings`

- `id uuid primary key`
- `owner_id uuid not null references owner_profiles(id)`
- `asset_id uuid not null references fleet_assets(id)`
- `kind text not null`
- `value numeric not null`
- `recorded_at timestamptz not null`
- `note text`

### `maintenance_rules`

- `id uuid primary key`
- `owner_id uuid not null references owner_profiles(id)`
- `asset_id uuid references fleet_assets(id)`
- `name text not null`
- `interval_value numeric not null`
- `interval_unit text not null`
- `lead_time_days integer not null default 14`
- `is_active boolean not null default true`

### `completed_maintenance`

- `id uuid primary key`
- `owner_id uuid not null references owner_profiles(id)`
- `asset_id uuid not null references fleet_assets(id)`
- `rule_id uuid references maintenance_rules(id)`
- `completed_at timestamptz not null`
- `odometer_miles numeric`
- `engine_hours numeric`
- `vendor_name text`
- `cost_cents integer not null default 0`
- `notes text`

### `compliance_requirements`

- `id uuid primary key`
- `owner_id uuid not null references owner_profiles(id)`
- `asset_id uuid references fleet_assets(id)`
- `kind text not null`
- `name text not null`
- `expires_at timestamptz not null`
- `alert_days_before integer not null default 30`
- `notes text`

### `fleet_documents`

- `id uuid primary key`
- `owner_id uuid not null references owner_profiles(id)`
- `asset_id uuid references fleet_assets(id)`
- `compliance_requirement_id uuid references compliance_requirements(id)`
- `title text not null`
- `storage_path text not null`
- `mime_type text not null`
- `expires_at timestamptz`
- `created_at timestamptz not null default now()`

## Index Plan

- Index every `owner_id` column.
- Add composite indexes for owner-scoped list views, such as `(owner_id, status)` on assets and `(owner_id, expires_at)` on compliance requirements and documents.
- Add `(owner_id, asset_id, recorded_at desc)` for readings and history timelines.
- Add `(owner_id, completed_at desc)` for maintenance history reporting.

## RLS Plan

Each operational table should enable Row Level Security and use policies that require `owner_id = auth.uid()`. Storage objects should use owner-prefixed paths and matching Storage policies.

## Migration Strategy

No migrations are included in Step 1. Step 2 should create migrations in small slices: owner profile, fleet assets, readings, maintenance, compliance, documents, and reports.
