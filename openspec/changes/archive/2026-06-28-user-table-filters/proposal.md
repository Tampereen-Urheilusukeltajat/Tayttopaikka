## Why

Admins receiving the daily new-user notification email need a quick way to find unactivated accounts (users where `isUser = false`) so they can review and activate them. Today they must manually scroll and visually scan the full user table with no filtering. The email link should land them directly on a pre-filtered view.

## What Changes

- Add a filter bar to the admin user table with a toggle for "Jäsen = ei" (isUser = false only)
- Support the filter state via URL query parameter (`?isUser=false`) so external links — e.g. from the daily digest email — can pre-activate it
- Update the daily digest email link from `https://tayttopaikka.fi/admin/users` to `https://tayttopaikka.fi/admin/users?isUser=false` so admins land on the filtered view
- When navigating to `/admin/users` without query parameters, no filters are applied (existing behaviour preserved)

## Capabilities

### New Capabilities
- `user-table-filters`: Client-side filter bar on the admin user table supporting `isUser` toggle, persisted in the URL query string

### Modified Capabilities
- `admin-new-user-notification`: Email link updated to include `?isUser=false` query parameter pointing admins directly at unactivated users

## Impact

- **Frontend:** `apps/frontend/src/views/Users/Users.tsx` — filter bar UI + URL query param read/write using React Router search params
- **Backend:** `apps/backend/src/lib/utils/newUserNotificationEmails.ts` — update `ADMIN_USERS_URL` constant to append `?isUser=false`
- No migrations, no pricing logic affected
- No API changes — filtering is client-side only

## Non-goals

- Server-side filtering (client-side is sufficient given the expected user count)
- Filters for any role other than `isUser` (other roles can be added later if needed)
- Persisting filter state beyond the URL (no localStorage, no session state)
- A general-purpose multi-field filter panel
