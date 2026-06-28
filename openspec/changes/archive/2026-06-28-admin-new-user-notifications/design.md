## Context

New users who register on Täyttöpaikka cannot use fill-related features until an admin manually grants them the appropriate role flags (`isBlender`, `isAdmin`, etc.). Currently admins have no automated signal that a registration occurred — they must poll the user list. The existing infrastructure already handles scheduled jobs (`node-cron` in `scheduler.ts`) and transactional email (Scaleway TEM via `sendEmail.ts`), so this feature is an additive composition of patterns that already work in production.

## Goals / Non-Goals

**Goals:**

- Send a daily digest email to every user with `isAdmin = true` listing every user registered in the past 24 hours.
- Fire at a single fixed time (19:00 Helsinki) so no state-tracking mechanism is required.
- Skip silently if no registrations occurred — do not send empty emails.
- Follow the exact same module structure as the user cleanup feature: scheduler → service → email util.

**Non-Goals:**
- Real-time per-registration notifications.
- Configurable recipients or multiple admin addresses.
- Frontend or API changes.
- Retry queuing — if the email send fails the error is logged and the cron job will attempt again the next day (users from that missed window will be lost, which is acceptable for an informational digest).

## Decisions

### Fixed send time, 24-hour lookback — no persistent state

**Decision:** Run the cron job once daily at 19:00 Europe/Helsinki and query `WHERE created_at >= NOW() - INTERVAL 24 HOUR`.

**Rationale:** The user described a "15:00–20:00 range" but noted that a single fixed time eliminates the need for a DB table or Redis key to track "when was the last email sent". A fixed time makes the lookback window deterministic and stateless. 19:00 fits within the stated window and gives the full working day for registrations to accumulate.

**Alternative considered:** Storing last-sent timestamp in Redis or a DB table would allow any send time but adds infrastructure complexity. The simpler approach is sufficient here.

### Module layout mirrors `userCleanup` pattern

**Decision:** Create `newUserNotificationService.ts` (service layer, contains DB query + orchestration) and `newUserNotificationEmails.ts` (email template), then wire into `scheduler.ts`.

**Rationale:** This is exactly how the user cleanup feature is structured. Consistency reduces onboarding cost and makes future changes predictable.

### No new migration

**Decision:** Query the existing `users.created_at` column directly.

**Rationale:** The column already exists and contains the registration timestamp. No schema change is required.

### Feature flag via env var

**Decision:** `NEW_USER_NOTIFICATION_ENABLED` — defaults to `true` when absent, so no extra configuration is needed in production unless the feature needs disabling.

**Rationale:** Consistent with how `USER_CLEANUP_ENABLED` is implemented.

## Risks / Trade-offs

**If the cron job or email send throws at 19:00, that day's registrations are missed** → Mitigation: log the error at `error` level (same as cleanup jobs); acceptable data loss for a non-critical informational digest.

**24-hour window based on wall-clock time may skip users registered in a DST transition hour** → Mitigation: MariaDB stores `created_at` in UTC; the cron job runs in Helsinki time but the SQL interval is UTC-based, so DST transitions shift the window by ±1 hour at most once a year. Acceptable for this use case.

**Admin user query returns no results** → Mitigation: log a warning and skip sending; this would mean no one is configured as admin which is a configuration problem, not a code problem.

## Migration Plan

1. Deploy backend with the new cron job and service files.
2. No new env vars required — admin recipients are resolved from the DB.
3. No DB migration or manual data step required.
4. Rollback: set `NEW_USER_NOTIFICATION_ENABLED=false` in Fly.io secrets and redeploy, or remove the job from `scheduler.ts` and redeploy.

## Open Questions

_None — all decisions are resolved above._
