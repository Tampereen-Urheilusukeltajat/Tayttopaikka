# User Cleanup System

Automated GDPR-compliant user data cleanup following the organization's data retention policy.

## Overview

The system automatically archives and anonymizes inactive user accounts according to the following timeline:

1. **34 months** after last login → Warning email sent
2. **36 months** after last login → Account archived + notification email
3. **48 months** after last login (12 months after archive) → Account anonymized

## Important Rules

- **Users with unpaid invoices are NEVER archived or anonymized**
  - Admin receives notification about such users
  - Cleanup waits until all invoices are paid
- **Archived users cannot log in** but data remains intact
  - Can be reactivated by contacting admin
- **Anonymization (soft delete)** clears PII but keeps transaction history
  - Sets `deleted_at` timestamp
  - Nulls: email, phone_number, forename, surname
  - Archives associated diving cylinder sets

## Architecture

### Database

**Migration**: `20260207182815_create_user_cleanup_audit.ts`

Creates `user_cleanup_audit` table to track all cleanup actions:

- `id` - Unique identifier
- `user_id` - Reference to user
- `action` - Type of action taken (warn, archive, anonymize, skipped)
- `reason` - Human-readable explanation
- `last_login_date` - When user last logged in
- `executed_at` - When action was performed

### Code Structure

```
src/
├── types/
│   └── userCleanup.types.ts         # TypeScript types and enums
├── lib/
│   ├── queries/
│   │   └── userCleanup.ts           # Database queries
│   ├── services/
│   │   └── userCleanupService.ts    # Main cleanup orchestration
│   └── utils/
│       ├── userCleanupEmails.ts     # Email notifications
│       └── scheduler.ts              # Cron job setup
├── database/
│   └── migrations/
│       └── 20260207182815_create_user_cleanup_audit.ts
└── test/
    └── lib/
        └── userCleanup.test.ts       # Tests
```

## Configuration

### Environment Variables

```bash
# Enable/disable cleanup scheduler (default: enabled)
USER_CLEANUP_ENABLED=true

# Admin email for notifications (default: gdpr@tayttopaikka.fi)
ADMIN_EMAIL=gdpr@tayttopaikka.fi

# Email service (Scaleway)
SCW_ACCESS_KEY=...
SCW_SECRET_KEY=...
SCW_DEFAULT_ORGANIZATION_ID=...
SCW_DEFAULT_PROJECT_ID=...
TRANSACTIONAL_FROM_EMAIL=...

# Frontend URL for user notifications
FRONTEND_HOSTNAME=https://tayttopaikka.fi
```

### Schedule

The cleanup job runs **monthly on the 1st at 2:00 AM** (Europe/Helsinki timezone).

Configured in `src/lib/utils/scheduler.ts` using cron syntax: `0 2 1 * *`

## How It Works

### Cleanup Process

1. **Query inactive users** at each milestone (34, 36, 48 months)
2. **Check audit log** to avoid duplicate actions
3. **Check for unpaid invoices**
   - If found: notify admin, log skip, continue to next user
4. **Perform action** (send email, archive, or anonymize)
5. **Log to audit table** for compliance tracking

### Email Notifications

**To Users:**

- 34-month warning: "Account will be archived in 2 months"
- Archive notification: "Account archived, will be anonymized in 12 months"

**To Admin:**

- When user with unpaid invoices is skipped
- Includes user details and unpaid invoice count

### Error Handling

- Each user is processed independently
- Failures are logged but don't stop processing
- Transactions rollback on errors
- Scheduler continues even if job fails

## Testing

Run tests:

```bash
pnpm --filter @tayttopaikka/backend test src/test/lib/userCleanup.test.ts
```

Tests cover:

- Inactive user queries
- Archive timestamp queries
- Audit logging
- Archive operations
- Anonymization operations
- Cylinder set archiving

## Manual Execution

To manually trigger cleanup (useful for testing):

```typescript
import { runUserCleanup } from './lib/services/userCleanupService';

await runUserCleanup();
```

Or add a temporary admin endpoint for testing (remove in production):

```typescript
// In a route file
fastify.post('/admin/run-cleanup', {
  preValidation: [fastify.authenticate, fastify.admin],
  handler: async (req, reply) => {
    await runUserCleanup();
    return { success: true };
  },
});
```

## Monitoring & Auditing

### Logs

All actions are logged with Winston:

- Job start/completion
- Each user processed
- Email notifications sent
- Errors and failures

Search logs for: `"user cleanup"`, `"cleanup job"`

### Audit Table

Query audit history:

```sql
-- Recent cleanup actions
SELECT * FROM user_cleanup_audit
ORDER BY executed_at DESC
LIMIT 100;

-- Actions for specific user
SELECT * FROM user_cleanup_audit
WHERE user_id = 'uuid-here'
ORDER BY executed_at DESC;

-- Count by action type
SELECT action, COUNT(*) as count
FROM user_cleanup_audit
GROUP BY action;

-- Users skipped due to unpaid invoices
SELECT u.email, uca.*
FROM user_cleanup_audit uca
JOIN user u ON u.id = uca.user_id
WHERE uca.action = 'skipped_unpaid_invoice'
ORDER BY uca.executed_at DESC;
```

## Reactivating Archived Users

When a user contacts admin to reactivate:

1. Verify user identity
2. Update user record:
   ```sql
   UPDATE user
   SET archived_at = NULL
   WHERE id = 'user-uuid';
   ```
3. User can now log in again
4. Next cleanup run will skip them (last_login updated on login)

## Troubleshooting

### Cleanup not running

1. Check `USER_CLEANUP_ENABLED` env var
2. Check server logs for scheduler initialization
3. Verify cron schedule matches expected timezone

### Users not being cleaned up

1. Check if they have unpaid invoices
2. Check audit table for previous actions
3. Verify `last_login` and `archived_at` timestamps
4. Check error logs

### Email not sending

1. Verify Scaleway credentials
2. Check email service logs
3. Test with manual `sendEmail()` call

## GDPR Compliance Notes

✅ **Data Minimization**: Only keeps data as long as necessary
✅ **Transparency**: Users notified before actions taken
✅ **Right to Erasure**: Manual deletion still available
✅ **Audit Trail**: All actions logged for compliance
✅ **Legal Obligations**: Respects accounting requirements (unpaid invoices)

The system follows the privacy policy stated in `apps/frontend/src/views/GDPR.tsx`.
