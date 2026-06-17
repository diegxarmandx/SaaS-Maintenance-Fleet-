# Rate Limiting and Abuse Protection

FleetReady uses a centralized Redis-compatible rate-limit layer for owner-facing abuse protection. Production enforcement is designed for Vercel/serverless runtimes and uses Upstash Redis through `@upstash/ratelimit`.

## Required Environment

Set these values in production:

```text
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_KEY_SALT=
```

`RATE_LIMIT_KEY_SALT` is used before hashing sensitive key material such as normalized emails, owner IDs, company IDs, and IP addresses. Do not reuse an application secret that may be exposed to the browser.

When Redis or the key salt is missing in production, the rate-limit utility fails closed and returns a generic 429. In development and test, missing Redis fails open so explicitly enabled local demo mode remains usable without external services.

## Local Redis Setup

For local development, either:

- Leave the Upstash values blank and set `ENABLE_LOCAL_DEMO=1` to use the read-only local demo without production enforcement.
- Create an Upstash Redis database and copy the REST URL/token into `.env.local`.
- Run a Redis-compatible local service only if it exposes an Upstash-compatible REST interface.

The production app must not use an in-memory store for enforcement.

## Policies

All policies use sliding windows:

| Policy | Limit | Identifier |
| --- | ---: | --- |
| Login | 5 per 15 minutes | Normalized email plus client IP |
| Password reset request | 3 per hour | Normalized email plus client IP |
| Email verification resend | 3 per hour | Authenticated owner user |
| General authenticated API | 120 per minute | Authenticated owner user plus fleet company |
| Dashboard/report operations | 20 per minute | Authenticated owner user plus fleet company |
| Fleet, maintenance, compliance, document, report, and settings mutations | 30 per minute | Authenticated owner user plus fleet company |
| Document and attachment uploads | 10 per 10 minutes | Authenticated owner user plus fleet company |
| Email or notification triggers | 5 per minute | Fleet company; cron trigger also has an IP limit |
| Public health endpoint | 30 per minute | Client IP |

Keys are built from hashed segments only. Full emails, access tokens, document names, file paths, and owner-entered data are not placed in rate-limit keys or logs.

## Protected Surfaces

- `signInAction`
- `requestPasswordResetAction`
- `/api/health`
- `/api/cron/reminders`
- `/reports/export`
- Dashboard and report server query entry points
- Fleet asset mutations and meter readings
- Maintenance rule/history mutations and receipt uploads
- Compliance requirement/record mutations and attachments
- Fleet document uploads, replacements, and archives
- Notification read/preference actions
- Report preference action
- Onboarding completion
- Stripe Checkout and Billing Portal actions

The app currently does not expose an owner-facing email-verification resend endpoint. The policy is configured for that endpoint when one is added. Password reset completion is handled by the Supabase authenticated session in the client form, not by a FleetReady server endpoint.

## Client IP Handling

The app only trusts proxy forwarding headers when running in a trusted deployment environment such as Vercel. Outside that context, arbitrary `x-forwarded-for` headers are ignored and the fallback key is used.

## Response Behavior

Blocked route handlers return:

- HTTP `429`
- Generic message: `Too many requests. Try again later.`
- `Retry-After`
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`
- matching `X-RateLimit-*` headers for compatibility

Server actions return or throw the same generic owner-facing message. Login and password-reset responses do not reveal whether a specific email exists.

## Upload Protection

Document uploads are private and server validated:

- Fleet documents and compliance documents allow PDF, JPEG, and PNG.
- Maintenance attachments allow PDF, JPEG, PNG, and WebP.
- Asset images allow JPEG, PNG, and WebP.
- MIME type, filename extension, file signature, and size are checked server-side.
- Storage names use randomized UUID path segments under the owner company UUID.
- A per-fleet storage quota hook exists at `src/features/documents/server/storage-quota.ts`; hard quota enforcement is deferred until plan-specific storage limits are defined.

Uploads are not publicly accessible. Downloads use short-lived signed URLs created only after owner-company metadata authorization.
