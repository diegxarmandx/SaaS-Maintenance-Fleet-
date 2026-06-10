# FleetReady Owner App

FleetReady is the foundation for an owner-only fleet maintenance SaaS for small fleets of roughly 1 to 25 vehicles, trailers, or equipment assets.

## Current Status

This repository contains the Step 1 foundation:

- Next.js App Router application with TypeScript and Tailwind CSS
- Accessible shared UI primitives in `src/components/ui`
- Branded application shell and placeholder routes
- Zod validation schemas for the core domain
- Supabase and transactional email provider abstractions
- Centralized environment validation and error handling
- Product, architecture, database, and implementation status docs

Complete feature modules are intentionally deferred.

## Routes

- `/`
- `/login`
- `/signup`
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
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure real values before connecting Supabase or email delivery.

Required for Supabase-backed implementation:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

Reserved for later reminders:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`

## Product Boundary

The product is strictly for fleet owners. It excludes managers, drivers, mechanics, dispatching, trips, GPS or ELD tracking, fuel tracking, payroll, customer invoicing, work orders, repair-shop scheduling, mechanic assignments, parts inventory, repair approval workflows, and repair-status workflows.

See `docs/product-scope.md` before adding new product behavior.
