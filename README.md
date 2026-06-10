# FleetReady Owner App

FleetReady is an owner-only fleet maintenance SaaS foundation for small fleets of roughly 1 to 25 vehicles, trailers, or equipment assets.

## Current Status

The repository now includes the Step 2 foundation:

- Next.js App Router application with TypeScript and Tailwind CSS
- Owner-only authentication and onboarding flow backed by Supabase Auth
- Protected owner routes through Supabase-aware middleware
- PostgreSQL migration with tenant tables, constraints, indexes, RLS, triggers, and storage policies
- Supabase Storage bucket preparation for asset images and fleet documents
- Development-only seed script with fictional data
- Zod validation, React Hook Form forms, and unit tests
- Centralized environment validation and error handling

Complete CRUD modules and Stripe billing are intentionally deferred.

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

Development seed:

```bash
npm run db:seed
```

The seed script refuses to run when `NODE_ENV=production` or `VERCEL_ENV=production`.

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
