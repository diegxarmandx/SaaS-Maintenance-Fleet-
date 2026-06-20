# Legal and Account Controls

This document describes the P1 launch-readiness controls added for legal links, support contact configuration, owner data export, and account/company deletion requests.

## Public Legal Routes

- `/privacy`: draft privacy notice for the owner-only fleet maintenance product.
- `/terms`: draft terms of service for the owner-only fleet maintenance product.
- `/support`: support contact page driven by `SUPPORT_EMAIL`.

These pages are launch-readiness drafts. They are not legal advice and must be reviewed by qualified counsel before production launch.

## Support Configuration

Set:

```bash
SUPPORT_EMAIL=support@example.com
```

Missing `SUPPORT_EMAIL` makes the support page show a configuration warning instead of a fake production contact. Configure and verify the mailbox before launch. Support messages should not include passwords, authentication tokens, signed document links, or private uploaded files.

## Owner Data Export

Owners can download a JSON export from `/settings` through `/settings/export`.

The export is versioned as `fleetready-owner-data-export-v1` and includes:

- Company profile
- Owner profile fields
- Measurement settings
- Assets
- Meter readings
- Maintenance templates, rules, and completed maintenance records
- Compliance requirements and records
- Document metadata and document version metadata
- Notification preferences and notifications
- Report preferences
- Audit events
- Safe subscription metadata

The export excludes:

- Supabase service-role keys and authentication tokens
- Stripe webhook payloads and provider secrets
- Private signed URLs
- Uploaded document and image file contents
- Other companies' tenant data
- Internal diagnostics and server logs

Uploaded files are not embedded in the JSON export. The manifest states this explicitly and includes metadata needed to reconcile files through a future controlled retrieval workflow.

## Deletion Request Workflow

Settings includes an Account and Data section with a deletion request form. The owner must type the company name exactly before a request is recorded.

For live Supabase accounts, the owner must also re-enter the current password before a request is recorded. The local read-only demo does not verify a password because it does not have a Supabase Auth session.

The app records the request in `account_deletion_requests` with:

- Owner ID
- Company ID
- Request timestamp
- Confirmation timestamp
- Status
- Internal failure reason field for operations

Supported statuses are:

- `requested`
- `confirmed`
- `processing`
- `completed`
- `failed`
- `canceled`

The current app records a confirmed deletion request. It does not automatically erase company data in the request action and does not pretend deletion is complete. A future operations worker or admin runbook must process `confirmed` requests, transition status through `processing`, and then mark `completed` or `failed`.

## Retention and Processing Notes

Deletion processing must distinguish these categories:

- Account and company records
- Fleet assets, maintenance, compliance, documents, notifications, and settings
- Private uploaded files in Supabase Storage
- Billing and subscription metadata
- Audit/security records
- Backups and logs

Some billing, security, backup, audit, or legal records may require retention after customer-facing data is deleted. Counsel and operations must define the final retention schedule before launch.

## Retry and Failure Handling

Processing failures should update `account_deletion_requests.status` to `failed` and write an internal reason to `failure_reason_internal`. Do not expose internal provider, database, or storage errors to owners. Retrying a failed request should transition it back to `processing` through the documented operations boundary.

## Security Notes

- Export and deletion actions use server-side owner context.
- Company IDs are not accepted from the browser.
- Live export queries are scoped to the authenticated owner company.
- Deletion request rows have RLS enabled and forced.
- Owners can select and insert their own company deletion request, but cannot update or delete request rows through authenticated client policies.
- Audit events are recorded for export requested/completed and deletion requested/confirmed.

## Manual Launch Actions

- Have `/privacy` and `/terms` reviewed by qualified counsel.
- Configure and verify `SUPPORT_EMAIL`.
- Apply the account legal-controls migration.
- Create an operations runbook or worker for processing confirmed deletion requests.
- Define backup, Storage object, billing record, and audit retention behavior.
