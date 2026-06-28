## 1. DB Query

- [x] 1.1 Add `getRecentlyRegisteredUsers` query to `apps/backend/src/lib/queries/user.ts` — returns users with `created_at >= NOW() - INTERVAL 24 HOUR`, selecting `id`, `forename`, `surname`, `email`, `created_at`
- [x] 1.2 Add `getAdminUsers` query to `apps/backend/src/lib/queries/user.ts` — returns all users with `is_admin = true`, selecting `id`, `forename`, `email`

## 2. Email Template

- [x] 2.1 Create `apps/backend/src/lib/utils/newUserNotificationEmails.ts` with a `sendNewUserDigestEmail(recipient, newUsers)` function — builds a Finnish-language email body listing each new user's name, email, and registration timestamp, includes a link to `https://tayttopaikka.fi/admin/users`, then calls `sendEmail` for the given recipient

## 3. Service

- [x] 3.1 Create `apps/backend/src/lib/services/newUserNotificationService.ts` with a `runNewUserNotification` function — calls `getRecentlyRegisteredUsers` (skips if empty), then `getAdminUsers` (warns and skips if empty), then calls `sendNewUserDigestEmail` for each admin

## 4. Scheduler Integration

- [x] 4.1 Add a `NEW_USER_NOTIFICATION_ENABLED` env-var check to `apps/backend/src/lib/utils/scheduler.ts` and register a cron job at `0 19 * * *` (Europe/Helsinki) that calls `runNewUserNotification`, following the existing cleanup job pattern
