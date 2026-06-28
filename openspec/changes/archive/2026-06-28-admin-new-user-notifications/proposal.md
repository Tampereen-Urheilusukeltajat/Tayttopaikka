## Why

When a user registers they have no access to fill events until an admin grants them the appropriate roles — but admins currently receive no signal that a new registration occurred, so new users may wait indefinitely. A daily digest email gives admins timely awareness without requiring them to poll the admin panel.

## What Changes

- Add a scheduled cron job that fires once per day at a fixed time (19:00 Helsinki time).
- The job queries for users registered since the previous run (i.e. the last 24 hours) and, if any exist, sends the digest email to every user with `isAdmin = true`.
- Email is written in Finnish, lists each new user's name, email, and registration timestamp in human-readable format, and uses the subject line "Täyttöpaikkaan on rekistöröitynyt uusia käyttäjiä".
- No database table or Redis key is needed: with a fixed daily send time the lookback window is always exactly 24 hours (`NOW - 24h`).
- The job is gated by an environment variable (`NEW_USER_NOTIFICATION_ENABLED`) so it can be disabled without a deployment.

## Capabilities

### New Capabilities

- `admin-new-user-notification`: Daily scheduled digest that emails admins about users who registered in the past 24 hours, using the existing email and scheduler infrastructure.

### Modified Capabilities

<!-- No existing spec-level requirements change -->

## Impact

- **`apps/backend/src/lib/utils/scheduler.ts`** — add a second cron job alongside the existing user cleanup job.
- **`apps/backend/src/lib/services/`** — new `newUserNotificationService.ts` containing the query and send logic.
- **`apps/backend/src/lib/utils/`** — new `newUserNotificationEmails.ts` for the email template, following the pattern of `userCleanupEmails.ts`.
- **No migrations.** Uses the existing `created_at` column on the users table.
- **No new env vars beyond** `NEW_USER_NOTIFICATION_ENABLED` (optional, defaults to enabled). Reuses existing Scaleway email credentials. Recipients are resolved dynamically by querying `is_admin = true` users from the DB.

## Non-goals

- Real-time (webhook/push) notification on every registration.
- Configurable or external recipient lists — the DB is the source of truth for who is an admin.
- Frontend changes — this is a backend-only scheduled job.
- Retry logic beyond what the existing email infrastructure provides.
