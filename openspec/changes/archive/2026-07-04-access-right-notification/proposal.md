## Why

A newly activated account cannot see anything useful in the application until an admin grants it the `isUser` flag, and the user currently has no way of knowing their account is ready other than trying to log in speculatively. An immediate email notification when `isUser` changes closes that gap.

## What Changes

- Send an email to a user when an admin changes their `isUser` flag via `PATCH /users/:userId/roles`.
- When `isUser` changes from `false` to `true`, the email tells the user their account is now active and they can log in and use the application, including a link to the frontend.
- When `isUser` changes from `true` to `false`, the email tells the user their account access has been deactivated.
- Other access-right flags (`isAdmin`, `isAdvancedBlender`, `isBlender`, `isInstructor`) do **not** trigger a notification — see Non-goals.
- If a request does not actually change the `isUser` value (e.g. it is omitted, or resubmitted with its current value), no email is sent.
- Email sending failures are logged but do not fail the admin's request — the roles update already succeeded in the database by the time the email is attempted.

## Capabilities

### New Capabilities
- `access-rights-notification`: Email notification sent to a user when an admin changes their `isUser` access right, distinguishing account activation from deactivation.

### Modified Capabilities
(none — no existing spec documents `PATCH /users/:userId/roles` behavior)

## Non-goals

- No notification for changes to `isAdmin`, `isBlender`, `isAdvancedBlender`, or `isInstructor` — scope is deliberately limited to `isUser`, the flag that gates whether a user can see anything useful in the application at all.
  - This scope was chosen specifically to avoid needing to coalesce rapid, independent `PATCH` requests: the admin Users table's role checkboxes each fire their own request immediately on click, so an admin activating a new member typically checks `isUser` and then separately checks other role checkboxes within seconds. Notifying on every flag would require detecting and merging that burst into one email, which — since the backend can run more than one instance at a time (see design.md) — is nontrivial to do correctly. Limiting the trigger to `isUser` sidesteps this: it's normally toggled once per admin session, and each `PATCH` request can be evaluated independently with no cross-request coordination needed.
- No digest/batching — an `isUser` change always results in an email attempt right away (unlike the existing daily new-user digest).
- No user-facing notification preferences or opt-out mechanism.
- No in-app notification, push notification, or webhook — email only.
- No changes to who can call `PATCH /users/:userId/roles` or its authorization (already admin-only).
- No changes to the `user` table schema or a migration — `isUser` already exists as a column; this only adds an email side-effect to the existing update path.
- No localization beyond Finnish, matching the existing notification emails in this codebase.

## Impact

- `apps/backend/src/routes/user/updateUserRoles.ts`: after a successful roles update, compare the pre- and post-update `isUser` value and trigger the notification email if it changed.
- New file `apps/backend/src/lib/utils/accessRightsChangeEmails.ts`: builds and sends the email, following the pattern of `newUserNotificationEmails.ts`.
- No database migration required.
- No pricing logic touched.
