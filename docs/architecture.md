# Architecture

## Stack

- Next.js App Router
- TypeScript with strict compiler settings
- Tailwind CSS 4
- Custom accessible UI primitives comparable to shadcn-style composition
- Zod validation
- React Hook Form for forms
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- Vercel-ready project layout
- Stripe reserved for a later billing step
- Transactional email provider abstraction reserved for reminders

## Source Structure

- `src/app`: App Router routes, route groups, loading states, and error boundaries
- `src/proxy.ts`: Supabase session check and route redirects
- `src/components/app-shell`: Owner workspace shell and navigation
- `src/components/placeholders`: Shared placeholder surfaces
- `src/components/ui`: Reusable UI primitives
- `src/features/auth`: Auth validation, actions, forms, and redirect rules
- `src/features/onboarding`: Company onboarding validation, action, and form
- `src/features/dashboard`: Owner dashboard boundary
- `src/features/fleet`: Fleet asset boundary
- `src/features/maintenance`: Maintenance boundary and interval calculations
- `src/features/compliance`: Compliance boundary
- `src/features/documents`: Document boundary
- `src/features/reports`: Reporting boundary
- `src/features/settings`: Settings boundary
- `src/lib/env`: Environment schemas and parsed config
- `src/lib/supabase`: Browser and server Supabase client factories
- `src/lib/email`: Transactional email provider contract
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
6. The RPC creates the company, links the owner profile, and creates the internal subscription record.
7. Completed owners can access protected application routes.

The app also supports login, logout, password-reset request, and password-reset completion.

## Tenant Security

Frontend checks are not trusted for tenant isolation. Tenant enforcement is implemented in PostgreSQL with RLS and helper functions. Every tenant-owned table is company-scoped, and Storage paths must begin with the company UUID.

The service-role key is used only by server-side helpers and the development seed script. It is never exposed to browser components.

## UI Approach

The app remains a quiet operational SaaS interface. It avoids role management, dispatching, driver workflows, work orders, repair-shop scheduling, and other excluded product areas.

## Testing Strategy

Unit tests cover:

- Validation schemas
- Tenant ownership helpers
- Maintenance interval calculations
- Authentication redirect rules
- Static migration checks for required tables, RLS, constraints, meter trigger, and Storage policies

Live Supabase integration tests are deferred until a project URL and service credentials are configured in CI.

## Deferred Integrations

- Full asset CRUD
- Reading capture UI
- Preventive maintenance rule builder
- Reminder calculation jobs and email delivery
- Compliance CRUD UI
- Document upload UI
- Owner report queries and visualizations
- Stripe billing
