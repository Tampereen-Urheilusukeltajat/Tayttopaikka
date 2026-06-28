## 1. Frontend — URL-aware filter state

- [x] 1.1 In `UsersPage`, replace the `searchQuery` `useState` approach for the isUser filter with `useSearchParams` from React Router; read `isUser` param on mount to initialise the filter toggle
- [x] 1.2 Add a boolean derived value `filterNonMembers` that is `true` when the `isUser` URL param equals `"false"`
- [x] 1.3 Update the `filteredUserData` memo to apply the `isUser === false` filter when `filterNonMembers` is active, in addition to the existing text search

## 2. Frontend — Filter toggle UI

- [x] 2.1 Add a "Näytä vain epäjäsenet" checkbox/toggle above the user table (alongside the existing search input), bound to `filterNonMembers`
- [x] 2.2 On toggle change, update the URL search params: set `isUser=false` when activated, remove the param when deactivated

## 3. Backend — Email link update

- [x] 3.1 In `apps/backend/src/lib/utils/newUserNotificationEmails.ts`, update `ADMIN_USERS_URL` to append `?isUser=false` so the email deep-links to the filtered view
