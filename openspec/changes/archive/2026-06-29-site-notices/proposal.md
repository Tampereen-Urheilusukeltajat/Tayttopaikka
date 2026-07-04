## Why

Admins need a way to post situational notices to users — e.g. "Compressor A is out of service" or "Oxygen analyser needs calibration" — scoped to the relevant physical space in the app. Currently there is no in-app channel for this; information must be communicated out-of-band.

## What Changes

- Admins can create, deactivate, and delete site notices with a message, an active date range, and per-view targeting flags.
- A notice banner component renders active notices below the navbar in authenticated views, filtered to the current route.
- A new admin UI page ("Ilmoitukset") is added to the admin dropdown for managing notices.

## Capabilities

### New Capabilities

- `site-notices`: Persistent admin-managed notices displayed as banners in targeted views (logbook, blender-logbook, or both). Notices have an active date range; admins control visibility by setting dates or deactivating manually.

### Modified Capabilities

<!-- No existing capability specs are changing. -->

## Impact

- **Database**: New `site_notice` table + migration. No changes to existing tables.
- **Backend**: New route group `/notices` (authenticated GET) and `/admin/notices` (POST, PATCH, DELETE).
- **Frontend**: New React Query hook, new `<SystemNoticeBanner />` component placed in `PrivateContent`, new admin page.
- **No pricing or invoicing logic affected.**

## Non-goals

- Frontpage (unauthenticated) notices — out of scope for now.
- Per-user dismissal of notices.
- Push notifications or email delivery.
- Rich text / HTML in notice messages.
