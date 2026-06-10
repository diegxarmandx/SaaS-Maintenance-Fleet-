# Architecture

## Stack

- Next.js App Router
- TypeScript with strict compiler settings
- Tailwind CSS 4
- Custom accessible UI primitives comparable to shadcn-style composition
- Zod validation
- React Hook Form for complex forms
- Supabase Auth, PostgreSQL, and Storage abstractions
- Vercel-ready project layout
- Stripe reserved for a later billing step
- Transactional email provider abstraction reserved for reminders

## Source Structure

- `src/app`: App Router routes, route groups, loading states, and error boundaries
- `src/components/app-shell`: Owner workspace shell and navigation
- `src/components/placeholders`: Shared placeholder surfaces
- `src/components/ui`: Reusable UI primitives
- `src/features/auth`: Authentication UI and validation
- `src/features/dashboard`: Owner dashboard boundary
- `src/features/fleet`: Fleet asset boundary
- `src/features/maintenance`: Maintenance boundary
- `src/features/compliance`: Compliance boundary
- `src/features/documents`: Document boundary
- `src/features/reports`: Reporting boundary
- `src/features/settings`: Settings boundary
- `src/lib/env`: Environment schemas and parsed config
- `src/lib/supabase`: Browser Supabase client factory
- `src/lib/email`: Transactional email provider contract
- `src/server/db`: Server-side Supabase access
- `src/validation`: Domain validation schemas

## Application Boundaries

The product is owner-only. Authentication and data access should always resolve an owner identity before reading or writing operational data. Future modules should use server-side data access by default and keep browser clients limited to Supabase Auth or explicitly safe public operations.

## Error Handling

`src/lib/errors.ts` defines `AppError`, shared error codes, and conversion helpers. Route-level and global error boundaries use this layer for consistent user-facing fallback messages.

## Environment Validation

Environment parsing is centralized under `src/lib/env`. Public variables are separated from server-only variables to avoid accidentally bundling secrets into client components.

## UI Approach

The first implementation uses lightweight accessible primitives in `src/components/ui` rather than installing a full component registry. Components keep 8px radii, visible focus states, semantic markup, stable spacing, and mobile-first layouts.

## Deferred Integrations

- Supabase Auth session middleware
- Supabase Row Level Security policies
- Supabase Storage upload flows
- Reminder calculation and email delivery
- Stripe billing
- Full module CRUD and reporting workflows
