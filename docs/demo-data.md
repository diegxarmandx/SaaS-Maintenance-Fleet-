# Demo Data

FleetReady includes a development-only demo seed system for reviewing the existing owner-only application with realistic fictional data. It does not add product features.

## Purpose

The demo seed populates one fictional owner company so dashboard cards, fleet lists, asset profiles, meter history, maintenance, compliance, documents, notifications, reports, settings, subscription display, search, filters, sorting, pagination, and asset-limit behavior can be reviewed locally.

## Demo Company

- Company: Northstar Fleet Services LLC
- Owner: Alex Rivera
- Email: `demo-owner@example.test`
- Phone: `555-0100`
- Timezone: `America/Puerto_Rico`
- Address: `DEMO ADDRESS - NOT REAL, 100 Fictional Yard Road, San Juan, PR 00900`

All values are fictional. Demo VIN-like values, license plates, policy numbers, permit numbers, phone numbers, and documents are not valid.

## Demo Login

Run the seed against a local Supabase project after migrations are applied:

```bash
npm run seed:demo
```

Default local login:

```text
Email: demo-owner@example.test
Password: ChangeMe-Demo-Only-123!
```

To choose a different development-only password:

```bash
DEMO_OWNER_PASSWORD="your-local-demo-password" npm run seed:demo
```

Do not reuse a real password.

## Commands

```bash
npm run seed:demo
npm run seed:demo:reset
npm run seed:minimal
npm run seed:empty
npm run db:seed
```

- `seed:demo`: creates or updates the full connected demo dataset.
- `seed:demo:reset`: deletes only the fictional demo company/auth user/storage prefix, then recreates full demo data.
- `seed:minimal`: creates a smaller demo with the company and a few assets.
- `seed:empty`: creates an onboarded owner company with no operational records for empty-state review.
- `db:seed`: compatibility alias for `seed:demo`.

## Production Safeguards

The scripts refuse to run when:

- `NODE_ENV=production`
- `VERCEL_ENV=production`
- `DEMO_SEED_TARGET=production`

The scripts require `DEMO_SEED_ALLOW=1`. Package scripts set it for local convenience. Reset requires `DEMO_SEED_RESET=confirm`.

Reset is scoped to:

- Company ID `11111111-1111-4111-8111-111111111111`
- Demo owner emails `demo-owner@example.test` and legacy `owner.demo@fleetready.test`
- Supabase Storage paths beginning with the demo company ID

No other company records should be deleted by reset.

## Records Created

The full seed creates:

- 1 fictional owner auth user
- 1 fictional company
- 15 assets: dump truck, medium-duty truck, pickup, cargo van, flatbed trailer, dump trailer, excavator, backhoe, wheel loader, generator, skid steer, other equipment, minimal-info equipment, and 2 archived assets
- Historical mileage and engine-hour readings
- Maintenance templates and maintenance rules covering mileage, hours, calendar, combined intervals, inactive rules, and no-history rules
- Completed maintenance records with parts, labor, other costs, and generated total costs
- Compliance requirements and records for registration, insurance, safety inspection, permits, operating license, weight certification, emissions, equipment certification, and a custom requirement
- Documents for registration, title-like/asset purchase, insurance, inspection, warranty, maintenance receipt, repair invoice, parts receipt, vehicle permit, equipment certification, owner manual, photo, and other review states
- Document version metadata
- Notifications for due-soon, overdue, expiring, expired, missing, read, unread, and resolved states
- Report preferences and notification preferences
- Internal subscription state using fictional Stripe test identifiers

## Expected Status Coverage

Dashboard and module views should include:

- Active assets
- Archived assets
- Maintenance current, due soon, and overdue
- Compliance current, expiring soon, expired, missing, and archived
- Documents current, expiring soon, expired, and archived
- Read, unread, and resolved notifications
- Recent maintenance, recent documents, and recent meter readings
- Maintenance costs by asset and category
- Report date ranges covering recent and older records

## Storage Behavior

By default, the seed attempts to upload small generated demo PDFs and a tiny demo PNG through Supabase Storage. Every generated PDF contains the text `DEMO DOCUMENT - NOT VALID`.

If Storage is not configured or upload fails, metadata remains seeded and the script logs a warning. To force metadata-only mode:

```bash
DEMO_SEED_METADATA_ONLY=1 npm run seed:demo
```

Metadata-only mode is useful when reviewing database screens without configured local Storage buckets.

## Stripe Test Behavior

The demo company receives an internal active `growing_fleet` subscription record with:

- Asset limit: 30
- Fictional Stripe customer ID
- Fictional Stripe subscription ID
- Fictional Stripe price ID

The seed does not contact Stripe, create products, create subscriptions, create charges, or send webhooks. Additional in-memory fixtures in tests cover past-due, canceled, read-only, and over-limit states.

## Known Limitations

- The seed uses metadata and generated placeholder files, not official forms, manuals, permits, invoices, or certificates.
- Notification rows are seeded directly for demonstration because the CLI seed does not run the Next.js scheduled reminder endpoint.
- End-to-end UI verification still requires a configured local Supabase project and browser session.
- The seed does not create live Stripe records or send email.

## Remove Demo Data

Run:

```bash
npm run seed:demo:reset
```

This removes and recreates the full demo data. To remove without recreating, run the underlying command directly:

```bash
DEMO_SEED_ALLOW=1 DEMO_SEED_RESET=confirm node scripts/seed-demo.mjs reset
```
