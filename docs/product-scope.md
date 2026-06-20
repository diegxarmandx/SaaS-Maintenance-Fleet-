# Product Scope

## Product Outcome

FleetReady helps a single fleet owner manage maintenance readiness, compliance obligations, documents, expirations, subscription access, and owner-facing reports for a small fleet of approximately 1 to 25 vehicles, trailers, or pieces of equipment. The initial billing plan envelope supports up to 30 active assets while preserving the small-fleet focus.

## Operational User Type

The application has one operational user type:

- Fleet owner

The owner is the accountable user for every asset, reading, rule, compliance requirement, document, alert, and report.

## Included Capabilities

FleetReady manages only these areas:

- Fleet assets
- Mileage and engine-hour readings
- Preventive maintenance rules and reminders
- Completed maintenance history and costs
- Compliance requirements
- Fleet documents
- Expiration alerts
- Owner-facing reports
- Subscription billing based on active-asset limits
- Owner account controls for support, legal links, data export, and deletion requests
- Asset-specific Inbox for owner-reviewed maintenance, compliance, document, and photo ingestion

## Excluded Capabilities

FleetReady must not expand into these areas:

- Managers
- Drivers
- Mechanics
- Employees
- Driver applications
- Driver inspections
- Dispatching
- Routes
- Trips
- GPS or ELD tracking
- Fuel tracking
- Payroll
- Customer invoicing
- Work orders
- Repair-shop scheduling
- Repair appointments
- Mechanic assignments
- Parts inventory
- Repair approval workflows
- Repair-status workflows
- User-seat pricing or role-based billing

## Product Guardrails

- Treat owner-only access as a domain invariant.
- Do not add workflows that imply delegated operational roles.
- Do not add logistics, driver, dispatch, payroll, invoicing, fuel, GPS, ELD, shop scheduling, work order, or repair-status behavior.
- Keep reminders derived from owner-managed readings, dates, maintenance rules, compliance requirements, and document expirations.
- Keep reports owner-facing and limited to included data domains.
- Keep subscription limits tied to active, non-archived assets rather than managers, drivers, mechanics, employees, or user seats.
- Do not hide, delete, or mutate an owner's fleet records because of a billing-state change.
- Treat data export and deletion requests as account controls, not as a new operational fleet workflow.
- Treat AI extraction as a draft-preparation aid only. It must not create maintenance, compliance, or document records without owner confirmation.
- Every Inbox item belongs to one known asset. There is no global Inbox, public upload link, QR-code workflow, or email forwarding.
- Keep batch import, duplicate detection, and automatic updates to existing maintenance or compliance history out of scope.

## Billing Guardrails

- Starter: up to 5 active assets.
- Small Fleet: up to 15 active assets.
- Growing Fleet: up to 30 active assets.
- Archived assets do not count toward active-asset limits.
- Owners above a downgraded limit can view records, access billing, and archive assets, but cannot create or reactivate another active asset until they archive assets or upgrade.
- Verified Stripe webhooks, not checkout redirects, are the source of truth for subscription state.
