# Scheduled Jobs

FleetReady prepares one scheduled reminder endpoint in Step 6:

```text
GET /api/cron/reminders
```

The endpoint processes all companies with server-only Supabase access. It generates maintenance, compliance, and document notifications; resolves stale notifications; and attempts eligible reminder emails.

## Required Secret

Set `CRON_SECRET` before enabling the job. Requests must include one of these headers:

```text
Authorization: Bearer <CRON_SECRET>
x-cron-secret: <CRON_SECRET>
```

If `CRON_SECRET` is missing, the endpoint returns `503`. If the header is invalid, it returns `401`.

The endpoint is also rate limited before secret validation. The trigger has an IP-scoped notification limit, and each company processed by the job has a fleet-scoped notification trigger limit. Rate-limited companies are skipped for that run instead of causing the entire job to fail.

## Local Manual Run

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Future Scheduler Preparation

No production schedule is committed. When production is ready, configure the approved scheduler to call `/api/cron/reminders` with the secret header and a cadence appropriate for owner reminders, usually once daily.

Logs intentionally include only aggregate counts and duration. They must not include owner emails, company names, file paths, secrets, or document contents.
