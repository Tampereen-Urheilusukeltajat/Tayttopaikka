## 1. Email content util

- [x] 1.1 Create `apps/backend/src/lib/utils/accessRightsChangeEmails.ts`
- [x] 1.2 Implement `sendUserStatusChangedEmail(user, isActivated: boolean)` that builds a Finnish subject/text: an activation message with a link to `FRONTEND_HOSTNAME` when `isActivated` is `true`, or a deactivation notice (no login link) when `false`, and calls `sendEmail`
- [x] 1.3 Log success/failure of the send via `log.info`/`log.error`, matching the pattern in `newUserNotificationEmails.ts`

## 2. Wire into the roles route

- [x] 2.1 In `apps/backend/src/routes/user/updateUserRoles.ts`, after `updateUsersRoles` returns `updatedUser`, compare `user.isUser` (pre-update) with `updatedUser.isUser` (post-update)
- [x] 2.2 Skip the email entirely when `isUser` did not change
- [x] 2.3 Call `sendUserStatusChangedEmail(updatedUser, updatedUser.isUser)` inside a `try/catch` that logs on failure and never throws, so the handler still responds with `updatedUser` on email failure
- [x] 2.4 Confirm the response and status code are unchanged from current behavior when email sending fails

## 3. Tests

- [x] 3.1 Unit test `sendUserStatusChangedEmail`: activation content includes the login link and "account active" message, deactivation content omits the login link and includes the "access removed" message, both in Finnish
- [x] 3.2 Integration test for `PATCH /users/:userId/roles`: granting `isUser` triggers an activation email (mock `sendEmail`) with correct recipient and content
- [x] 3.3 Integration test for `PATCH /users/:userId/roles`: revoking `isUser` triggers a deactivation email
- [x] 3.4 Integration test for `PATCH /users/:userId/roles`: changing only `isBlender`/`isAdvancedBlender`/`isInstructor`/`isAdmin` (with `isUser` unchanged) results in no email being sent
- [x] 3.5 Integration test for `PATCH /users/:userId/roles`: resubmitting the current `isUser` value results in no email being sent
- [x] 3.6 Integration test for `PATCH /users/:userId/roles`: when `sendEmail` throws, the endpoint still returns 200 with the updated user

## 4. Verification

- [x] 4.1 Run `pnpm run check-types`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm --filter @tayttopaikka/backend test`
