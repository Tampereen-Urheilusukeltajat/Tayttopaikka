## 1. Database Migration

- [x] 1.1 Generate migration file: `pnpm --filter @tayttopaikka/backend db:migrate:make create_site_notice`
- [x] 1.2 Implement migration `up()`: create `site_notice` table with pre-check (table must not exist) and post-check (verify all columns present)
- [x] 1.3 Run migration locally and verify table is created correctly

## 2. Backend — Types and Queries

- [x] 2.1 Add TypeBox schema for `SiteNotice` in `apps/backend/src/types/`
- [x] 2.2 Create `apps/backend/src/lib/queries/siteNotice.ts` with: `getActiveNotices()`, `getAllNotices()` (admin, JOINs user to include poster's full name), `createNotice()`, `updateNotice()`, `deleteNotice()`

## 3. Backend — Routes

- [x] 3.1 Create `apps/backend/src/routes/notices/` with `GET /` handler (authenticated, returns active notices)
- [x] 3.2 Create `apps/backend/src/routes/admin/notices/` with `POST /`, `PATCH /:id`, `DELETE /:id` handlers (admin only)
- [x] 3.3 Register both route groups in `apps/backend/src/server.ts`

## 4. Frontend — Data Layer

- [x] 4.1 Add `getNotices()` API request function in `apps/frontend/src/lib/apiRequests/`
- [x] 4.2 Add `useNoticesQuery()` React Query hook in `apps/frontend/src/lib/queries/`
- [x] 4.3 Add admin mutation functions (`createNotice`, `updateNotice`, `deleteNotice`) and a `useNoticesMutations` hook

## 5. Frontend — Notice Banner Component

- [x] 5.1 Create `apps/frontend/src/components/SystemNoticeBanner/SystemNoticeBanner.tsx` — fetches active notices, filters by current route using `useLocation()`, renders stacked Bootstrap `Alert` components ordered by `active_from` descending
- [x] 5.2 Add `<SystemNoticeBanner />` between `<Navbar />` and `<Container>` in `apps/frontend/src/components/common/PrivateContent.tsx`
- [x] 5.3 Verify banner appears correctly on `/logbook` and `/blender-logbook`, and does not appear on other views when notice is not targeting them

## 6. Frontend — Admin UI

- [x] 6.1 Create `apps/frontend/src/views/SiteNotices/SiteNotices.tsx` — lists all notices (active and expired) with deactivate/delete actions
- [x] 6.2 Add create-notice form (message textarea, `show_logbook` / `show_blender_logbook` checkboxes, optional `active_to` datetime picker)
- [x] 6.3 Add `/admin/notices` route in `apps/frontend/src/App.tsx` (admin only)
- [x] 6.4 Add "Ilmoitukset" link to the admin dropdown in `apps/frontend/src/components/Navbar/AdminDropdown.tsx` (or `Navbar.tsx`)

## 7. Verification

- [x] 7.1 Run `pnpm run check-types` and fix any type errors
- [x] 7.2 Run `pnpm run lint` and fix any warnings
- [ ] 7.3 Manually test: create a logbook-only notice, verify it shows on `/logbook` and not on `/blender-logbook`; set `active_to` to now, verify it disappears
