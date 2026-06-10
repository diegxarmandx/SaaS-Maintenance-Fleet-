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
- `src/components/ui`: Reusable UI primitives, including page headers, breadcrumbs, status badges, empty states, form controls, upload areas, tables, mobile card lists, skeletons, error messages, toast region, pagination, and confirmation submit controls
- `src/features/auth`: Auth validation, actions, forms, and redirect rules
- `src/features/onboarding`: Company onboarding validation, action, and form
- `src/features/dashboard`: Owner dashboard boundary
- `src/features/fleet`: Fleet asset boundary with constants, validation, pure helpers, server queries/actions, responsive list UI, asset forms, asset profile, and meter-reading form
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

The authenticated shell uses a desktop sidebar, mobile navigation, current company context, owner profile menu, prepared global search input, and prepared notification indicator. The company area intentionally represents one current owner company only.

Statuses use text plus Lucide icons, not color alone. The current shared status vocabulary is:

- Current
- Due soon
- Overdue
- Expired
- Missing
- Archived

Fleet asset screens use desktop tables and mobile card lists so small-screen owners are not forced into horizontal data tables.

## Fleet Asset Slice

Step 3 implements real Supabase-backed asset CRUD while preserving database RLS as the tenant boundary:

- `/fleet` lists owner-company assets with search, status/type filters, sorting, pagination, desktop table, and mobile cards.
- `/fleet/new` creates an asset with server-side validation and optional private image upload.
- `/fleet/[assetId]` shows asset overview, maintenance/compliance/document summaries, meter history, expense summary, notes, archive action, and a meter-reading form.
- `/fleet/[assetId]/edit` updates asset details and can replace the asset image.

Asset writes use server actions. Browser code never receives a Supabase service-role key. Asset image uploads use the authenticated owner session and private Storage policies requiring the first path segment to match the owner company UUID.

Meter readings are created through `public.create_meter_reading_for_asset(...)`, which resolves the owner company from `auth.uid()`, verifies the asset belongs to that company, inserts the reading, and lets the existing trigger update current mileage or hours transactionally. Decreasing readings require the explicit correction flag and a note.

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

Live Supabase integration tests are deferred until a project URL and service credentials are configured in CI.

## Deferred Integrations

- Preventive maintenance rule builder
- Reminder calculation jobs and email delivery
- Compliance CRUD UI
- Document upload UI
- Owner report queries and visualizations
- Stripe billing
