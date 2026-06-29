## Context

The app has no in-app mechanism for admins to communicate situational status to users. Physical spaces (air room, oxygen room) have their own compressors and equipment, so notices often apply to just one space. The feature must be low-friction to manage and reliably visible.

Authenticated views share a single layout wrapper (`PrivateContent`) that renders `<Navbar />` followed by a Bootstrap `<Container>` with `<Outlet />`. This is the natural insertion point for a shared notice banner.

## Goals / Non-Goals

**Goals:**
- Admins can create/deactivate/delete notices scoped to logbook, blender-logbook, or both.
- Active notices appear as stacked Bootstrap alerts below the navbar in relevant views.
- Active date range controls visibility without manual intervention.
- Multiple notices can be active simultaneously.

**Non-Goals:**
- Unauthenticated (frontpage) notices.
- Per-user dismissal.
- Push/email delivery.
- Rich text in messages.

## Decisions

### 1. Boolean flags for view targeting (not a join table)

`show_logbook BOOLEAN` and `show_blender_logbook BOOLEAN` columns directly on `site_notice`. Adding a new target view in the future is a migration adding one column; existing notices default to `FALSE` for that view.

**Alternative considered:** `site_notice_target_view` join table. Rejected — unnecessary complexity for a small, known set of views. Boolean flags are explicit and map directly to checkboxes in the admin UI.

### 2. Single insertion point in `PrivateContent`

`<SystemNoticeBanner />` is placed between `<Navbar />` and `<Container>` in `PrivateContent.tsx`. It uses `useLocation()` to determine the current route and filters notices accordingly.

**Alternative considered:** Each view explicitly renders the banner. Rejected — requires touching every view and risks inconsistency.

### 3. `active_from` / `active_to` date range (NULL = no expiry)

`active_from DATETIME NOT NULL` (defaults to creation time) and `active_to DATETIME NULL`. `NULL` means the notice has no scheduled end date; the admin deactivates or deletes manually. Backend filter: `active_from <= NOW() AND (active_to IS NULL OR active_to > NOW())`.

**Alternative considered:** `is_active` boolean only (no dates). Rejected — date range gives admins the option to schedule notices in advance and auto-expire them, which costs nothing extra to implement.

### 4. Client-side route filtering

The GET `/notices` endpoint returns all currently active notices (no route parameter). The `<SystemNoticeBanner />` component filters by current route client-side using the boolean flags. This keeps the API simple and avoids coupling the backend to frontend route names.

### 5. Admin UI as a new admin page

A new `/admin/notices` route with list + create form, linked from the existing admin dropdown. Consistent with the pattern used by gas prices, invoice, and user management.

## Data model

```sql
CREATE TABLE site_notice (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message              TEXT NOT NULL,
  show_logbook         BOOLEAN NOT NULL DEFAULT FALSE,
  show_blender_logbook BOOLEAN NOT NULL DEFAULT FALSE,
  active_from          DATETIME NOT NULL,
  active_to            DATETIME NULL,        -- NULL = no expiry
  created_by           INT UNSIGNED NOT NULL,
  created_at           DATETIME NOT NULL,
  CONSTRAINT fk_site_notice_user FOREIGN KEY (created_by) REFERENCES user(id)
);
```

## Risks / Trade-offs

- **Clock skew between server and client** → `active_from`/`active_to` filtering happens server-side only; no client-side date check. Not a risk.
- **Stacked alerts UX** → If an admin creates many notices the banner grows tall. Accepted — it is the admin's responsibility to keep notices tidy.
- **No rollback needed** → The migration only adds a new table. Existing data is untouched. If something goes wrong the table can be dropped manually.

## Migration Plan

1. Create migration with `pnpm --filter @tayttopaikka/backend db:migrate:make create_site_notice`.
2. Migration adds the `site_notice` table. Pre-check: verify table does not already exist. Post-check: verify table was created with expected columns.
3. Migration is backward-compatible — no existing tables or columns are modified.
4. Deploy backend first (table exists before frontend ships the new UI).

## Open Questions

- ~~Should `created_by` be shown in the admin UI?~~ **Resolved:** Yes — the admin list view SHALL display the poster's name alongside each notice for accountability.
