# Spec: Site Notices

## Purpose

Site notices allow admins to publish transient messages that are displayed as banners to authenticated users in targeted views (logbook, blender logbook). Notices have an optional expiry time and can be deactivated or deleted by admins without affecting historical data.

---

## Requirements

### Requirement: Admin can create a site notice
An admin SHALL be able to create a site notice with a message, at least one view target flag, and an optional active-to date. `active_from` defaults to the current timestamp.

#### Scenario: Admin creates a logbook-only notice
- **WHEN** an admin POSTs to `/admin/notices` with `message`, `show_logbook: true`, `show_blender_logbook: false`
- **THEN** the notice is persisted and returned with status 201

#### Scenario: Admin creates a notice targeting both logbooks
- **WHEN** an admin POSTs with `show_logbook: true` and `show_blender_logbook: true`
- **THEN** the notice is persisted and returned with status 201

#### Scenario: Non-admin cannot create a notice
- **WHEN** a non-admin user POSTs to `/admin/notices`
- **THEN** the server returns 403

#### Scenario: At least one view flag must be true
- **WHEN** an admin POSTs with `show_logbook: false` and `show_blender_logbook: false`
- **THEN** the server returns 400

---

### Requirement: Admin can deactivate a site notice
An admin SHALL be able to set `active_to` to a past datetime (or the current time) to immediately stop showing a notice, without deleting it.

#### Scenario: Admin deactivates a notice
- **WHEN** an admin PATCHes `/admin/notices/:id` with `active_to` set to a past datetime
- **THEN** the notice no longer appears in GET `/notices` responses

#### Scenario: Admin updates message text
- **WHEN** an admin PATCHes `/admin/notices/:id` with a new `message`
- **THEN** the notice is updated and the new message is returned

---

### Requirement: Admin can delete a site notice
An admin SHALL be able to permanently delete a notice.

#### Scenario: Admin deletes a notice
- **WHEN** an admin DELETEs `/admin/notices/:id`
- **THEN** the notice is removed from the database and 204 is returned

#### Scenario: Deleting a non-existent notice returns 404
- **WHEN** an admin DELETEs `/admin/notices/:id` for an ID that does not exist
- **THEN** the server returns 404

---

### Requirement: Active notices are served to authenticated users
The GET `/notices` endpoint SHALL return all notices where `active_from <= NOW()` AND (`active_to IS NULL` OR `active_to > NOW()`). Only authenticated users may call this endpoint.

#### Scenario: Active notice is returned
- **WHEN** an authenticated user GETs `/notices` and a notice has `active_from` in the past and `active_to` NULL
- **THEN** the notice is included in the response

#### Scenario: Expired notice is not returned
- **WHEN** a notice has `active_to` set to a past datetime
- **THEN** it is NOT included in the GET `/notices` response

#### Scenario: Future notice is not returned
- **WHEN** a notice has `active_from` set to a future datetime
- **THEN** it is NOT included in the GET `/notices` response

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated request is made to GET `/notices`
- **THEN** the server returns 401

---

### Requirement: Notice banner is displayed in targeted views
The frontend SHALL render active notices as stacked Bootstrap warning alerts below the navbar, filtered to the current route.

#### Scenario: Logbook notice shows on logbook view only
- **WHEN** a notice has `show_logbook: true` and `show_blender_logbook: false`
- **THEN** it appears on `/logbook` and does NOT appear on `/blender-logbook`

#### Scenario: Both-logbook notice shows in both views
- **WHEN** a notice has both `show_logbook: true` and `show_blender_logbook: true`
- **THEN** it appears on both `/logbook` and `/blender-logbook`

#### Scenario: Multiple active notices stack
- **WHEN** two or more notices are active for the current view
- **THEN** all are rendered as separate alerts, ordered by `active_from` descending

#### Scenario: No notices renders no banner
- **WHEN** no notices are active for the current view
- **THEN** no alert element is rendered
