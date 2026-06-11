# FleetReady Owner App

FleetReady is an owner-only fleet maintenance SaaS foundation for small fleets of roughly 1 to 25 vehicles, trailers, or equipment assets.

## Current Status

The repository now includes the Step 4 preventive maintenance foundation:

- Next.js App Router application with TypeScript and Tailwind CSS
- Owner-only authentication and onboarding flow backed by Supabase Auth
- Protected owner routes through Supabase-aware middleware
- PostgreSQL migration with tenant tables, constraints, indexes, RLS, triggers, and storage policies
- Supabase Storage bucket preparation for asset images and fleet documents
- Development-only seed script with fictional data
- Fleet asset CRUD screens backed by Supabase and RLS
- Mileage and engine-hour reading capture through a secure database RPC
- Preventive maintenance rule creation, status calculations, and overview
- Completed maintenance records with transactional rule advancement
- Maintenance history, cost summaries, and secure attachment preparation
- Private asset image upload preparation with MIME and size validation
- Zod validation, React Hook Form forms, and unit/static tests
- Centralized environment validation and error handling

Compliance, fleet document management, reports, reminders, email delivery, and Stripe billing are intentionally deferred beyond this maintenance step.

## Routes

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/onboarding`
- `/dashboard`
- `/fleet`
- `/maintenance`
- `/compliance`
- `/documents`
- `/reports`
- `/settings`
- `/fleet/new`
- `/fleet/[assetId]`
- `/fleet/[assetId]/edit`
- `/maintenance/rules/new`
- `/maintenance/complete`
- `/maintenance/history/[recordId]`
- `/maintenance/history/[recordId]/edit`

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Validate the project:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Supabase

Create a Supabase project, configure the environment variables below, then apply the migration in `supabase/migrations`.

Apply migrations in filename order:

```bash
supabase db push
```

Development seed:

```bash
npm run db:seed
```

The seed script refuses to run when `NODE_ENV=production` or `VERCEL_ENV=production`.

Fleet asset images are stored in the private `asset-images` bucket under company-scoped paths:

```text
{company_id}/assets/{asset_id}/{filename}
```

Maintenance receipt and invoice attachments are stored in the private `maintenance-attachments` bucket under company-scoped, non-guessable paths:

```text
{company_id}/maintenance/{maintenance_record_id}/{uuid}-{filename}
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure real values.

Required for Supabase-backed implementation:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_ASSET_IMAGES_BUCKET`
- `SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET`
- `SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET`

Reserved for later reminders:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`

## Product Boundary

The product is strictly for fleet owners. It excludes managers, drivers, mechanics, dispatching, trips, GPS or ELD tracking, fuel tracking, payroll, customer invoicing, work orders, repair-shop scheduling, mechanic assignments, parts inventory, repair approval workflows, and repair-status workflows.

See `docs/product-scope.md` before adding new product behavior.
