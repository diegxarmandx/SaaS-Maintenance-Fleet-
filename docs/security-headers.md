# Security Headers

Maintly sets application security headers from `config/security-headers.ts` through the Next.js `headers()` configuration hook.

## Header Set

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` in production only

## Content Security Policy

The CSP is generated from directive arrays rather than a single hand-written string. Current policy goals:

- Restrict default loading to `self`.
- Prevent app embedding with `frame-ancestors 'none'` and `X-Frame-Options: DENY`.
- Allow private Supabase Storage image/document previews through approved Supabase origins.
- Allow browser Supabase Auth requests through `connect-src` when `NEXT_PUBLIC_SUPABASE_URL` is configured.
- Keep development-only WebSocket and `unsafe-eval` allowances out of production.

## Unsafe Directives

Maintly keeps two unsafe directives for known framework and UI constraints:

- `script-src 'unsafe-inline'`: required by the current Next.js App Router hydration and Flight payloads because the app does not yet issue CSP nonces from proxy middleware.
- `style-src 'unsafe-inline'`: required by existing inline chart width styles and by Next development styles.

`script-src 'unsafe-eval'` is development-only for the Next.js development runtime and is not emitted in production.

Approved external domains should be added to the arrays in `config/security-headers.ts` rather than by editing the final CSP string.
