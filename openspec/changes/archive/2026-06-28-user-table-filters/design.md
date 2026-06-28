## Context

The admin user table (`UsersPage`) already has a text-search filter backed by local React state (`useState`). Filtering is purely client-side — the backend returns all users and the frontend narrows the list. The page currently has no URL-aware state, so there is no way to bookmark or link to a filtered view.

The daily digest email links to `/admin/users` with no parameters; admins then have to manually find unactivated accounts.

## Goals / Non-Goals

**Goals:**
- Add an `isUser=false` toggle filter to the user table
- Sync the toggle state to the URL query string (`?isUser=false`) via React Router's `useSearchParams`
- Initialise the filter from the URL on page load so email deep-links work
- Update the email notification link to include `?isUser=false`

**Non-Goals:**
- Server-side filtering
- Filters for any role besides `isUser`
- Persisting filter state outside the URL

## Decisions

### 1. URL state via `useSearchParams` (React Router)

React Router is already in use throughout the app. `useSearchParams` is the idiomatic way to read and write query parameters without adding dependencies or manual `window.location` manipulation. The hook re-renders the component when params change, keeping local filter state in sync.

Alternative considered: plain `useState` + `useEffect` to sync with `history.pushState`. Rejected because it duplicates what React Router already provides and is harder to test.

### 2. Client-side filtering only

The backend `/api/user` endpoint already returns all users. The expected user count for a diving club is small (tens to low hundreds), so client-side filtering is fast and avoids adding a query parameter to the API.

Alternative considered: backend filter parameter on `/api/user`. Rejected — unnecessary complexity for the data volume; also keeps the change isolated to the frontend.

### 3. Filter representation in URL: `?isUser=false`

Using `isUser=false` (the field name from the domain model) is self-documenting in the URL. The absence of the parameter means "no filter" — consistent with the requirement that navigating to the page without params shows all users.

Alternative considered: `?filter=unactivated`. Rejected — more opaque and harder to extend later.

### 4. Combining with existing text search

The existing `searchQuery` state is kept as-is. The two filters are applied as a pipeline: first apply the `isUser=false` filter (if active), then apply the text search on top. Both can be active simultaneously.

### 5. Email link update

`ADMIN_USERS_URL` in `newUserNotificationEmails.ts` is updated to `${FRONTEND_HOSTNAME}/admin/users?isUser=false`. This is the only backend change.

## Risks / Trade-offs

- **URL parameter pollution**: If future filters are added, individual query params per field scale fine and remain human-readable.
- **Back-button behaviour**: Using `useSearchParams`'s setter with the default push behaviour means changing the toggle adds a history entry. This is acceptable and expected for URL-driven filter state.
- **Stale email links**: If the query parameter naming ever changes, old email links will silently fall back to showing all users (no filter applied). Low risk given the param is simple.
