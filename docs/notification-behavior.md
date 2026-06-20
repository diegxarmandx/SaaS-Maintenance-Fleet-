# Notification Behavior

FleetReady notifications are owner-only and company-scoped. They are reminders about records the owner has entered; they do not submit, renew, dispatch, assign, or manage work for anyone else.

## Generated Notifications

The scheduled reminder process can generate:

- Maintenance due soon or overdue
- Compliance expiring soon, expired, or missing
- Documents expiring soon or expired
- Weekly owner summary email records

Each active reminder has a stable `notification_key`. The database prevents duplicate unresolved notifications for the same company and key.

## Lifecycle

1. The scheduled job calculates current maintenance, compliance, and document status from source records.
2. Matching active reminders are inserted or updated.
3. Existing active reminders that no longer match are marked resolved and read.
4. Unread notifications appear in the owner shell notification menu.
5. Owners can mark one notification or all active notifications as read.
6. Email is attempted only when notification preferences enable email and the notification has not already been sent.
7. Warning and critical email categories can be enabled independently.
8. Optional quiet hours suppress reminder email attempts in the company timezone while preserving in-app notifications.

## Email Delivery

Local development should use:

```text
EMAIL_PROVIDER=none
```

Production reminder email delivery supports:

```text
EMAIL_PROVIDER=resend
EMAIL_FROM=FleetReady <reminders@example.com>
RESEND_API_KEY=<secret>
```

Failed email attempts are recorded with status, attempt timestamp, attempt count, and an error message. The browser never receives email-provider secrets.

Settings also show lightweight notification analytics for active, unread, critical, and failed-email counts. These are read-only operational counts for the owner and do not introduce manager, driver, mechanic, or employee workflows.
