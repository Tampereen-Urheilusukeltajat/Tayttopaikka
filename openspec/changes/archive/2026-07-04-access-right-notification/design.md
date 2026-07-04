## Context

`PATCH /users/:userId/roles` (`apps/backend/src/routes/user/updateUserRoles.ts`) already loads the target user with `getUserWithId(userId, true)` before calling `updateUsersRoles(userId, req.body)`, which writes the new flags and returns the updated user. Both the pre-update and post-update `User` objects contain `isUser`, so a before/after comparison needs no additional query.

An earlier version of this design tried to notify on *any* access-right flag change. Since the admin Users table's role checkboxes each fire their own `PATCH` immediately (`apps/frontend/src/views/Users/Users.tsx:68-78`), and the backend can run more than one instance at a time (Fly.io's `canary` deploy strategy in `infra/backend/fly.toml` briefly runs two machines during every deploy), that version needed a debounce mechanism coordinated across instances (e.g. via Redis) to avoid sending one email per checkbox click. That cross-instance coordination was judged to be more complexity than this feature warrants. Scoping the notification to `isUser` only removes the need for it entirely: `isUser` is normally toggled once per admin session, and each `PATCH` request can be evaluated independently — no coordination between requests or instances is needed.

The codebase has an existing pattern for transactional-style notification emails: `lib/utils/newUserNotificationEmails.ts` builds a Finnish plain-text email and calls `sendEmail` (Scaleway Tem SDK, `to`/`subject`/`text`), and `lib/queries/resetRequest.ts` / `lib/queries/setPassword.ts` show `sendEmail` already being awaited directly inside a route's request/response cycle.

## Goals / Non-Goals

**Goals:**
- Notify a user by email, synchronously within the `PATCH /users/:userId/roles` request, whenever that request actually changes their `isUser` value.
- Distinguish activation (`false` → `true`) from deactivation (`true` → `false`) with different messaging.
- Never let an email failure turn a successful roles update into a failed HTTP response.

**Non-Goals:**
- No debounce, coalescing, or any cross-request/cross-instance coordination — each request is handled independently (see Context for why this is safe at the current scope).
- No notification for `isAdmin`, `isBlender`, `isAdvancedBlender`, or `isInstructor` changes.
- No queueing/background job infrastructure — this is a direct, synchronous call like the password reset emails.
- No notification preferences, opt-out, or email digesting.

## Decisions

- **Compare `isUser` in the route handler, not in the query layer.** `updateUserRoles.ts` already has the pre-update `user` and receives the post-update `updatedUser` from `updateUsersRoles`. Compare `user.isUser !== updatedUser.isUser` inline in the handler. This avoids modifying `updateUsersRoles`'s return shape or adding a redundant lookup.
- **New util `lib/utils/accessRightsChangeEmails.ts`** mirrors `newUserNotificationEmails.ts`: `sendUserStatusChangedEmail(user, isActivated: boolean)` builds the Finnish subject/text (activation message with a login link vs. deactivation notice) and calls `sendEmail`.
- **Send synchronously, swallow errors.** Call the send function with `await` directly in the handler, wrapped in `try/catch` that logs via `log.error` and does not rethrow — consistent with how `newUserNotificationService` handles per-admin send failures in a loop. The HTTP response is built from `updatedUser` regardless of email outcome.
- **No-op when `isUser` didn't change.** If the request didn't change `isUser` (omitted from the payload, or resubmitted with its current value), skip calling the email function entirely.

## Risks / Trade-offs

- [Synchronous email call adds latency to the admin's request] → Same trade-off already accepted for password reset emails in this codebase; Scaleway Tem calls are expected to be fast, and a slow admin action is preferable to added infra for a low-volume, admin-triggered endpoint.
- [No notification for other role changes, e.g. promoting a user to blender/instructor] → Accepted scope reduction: `isUser` is the flag that gates whether the user sees anything useful at all, making it the highest-value case; extending to other flags later would need to revisit the coalescing/coordination problem described in Context.
- [Admin changes their own `isUser` and expects no self-notification] → Out of scope to special-case; not realistically triggerable in practice, since an admin editing the Users table already has `isUser = true`.

## Open Questions

None — feature scope is self-contained within the existing `PATCH /users/:userId/roles` route.
