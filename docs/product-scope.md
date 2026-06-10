# Product Scope

## Product Outcome

FleetReady helps a single fleet owner manage maintenance readiness, compliance obligations, documents, expirations, and owner-facing reports for a small fleet of approximately 1 to 25 vehicles, trailers, or pieces of equipment.

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

## Product Guardrails

- Treat owner-only access as a domain invariant.
- Do not add workflows that imply delegated operational roles.
- Do not add logistics, driver, dispatch, payroll, invoicing, fuel, GPS, ELD, shop scheduling, work order, or repair-status behavior.
- Keep reminders derived from owner-managed readings, dates, maintenance rules, compliance requirements, and document expirations.
- Keep reports owner-facing and limited to included data domains.

## Step 1 Acceptance

- The application shell and route placeholders exist.
- The domain scope is documented and reflected in module boundaries.
- No complete operational module is implemented yet.
- No fake production data or unrelated fleet operations are introduced.
