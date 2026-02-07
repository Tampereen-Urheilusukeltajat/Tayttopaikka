import { Type, type Static } from '@sinclair/typebox';

export enum CleanupAction {
  WARN_34_MONTHS = 'warn_34_months',
  ARCHIVE_36_MONTHS = 'archive_36_months',
  WARN_47_MONTHS = 'warn_47_months',
  ANONYMIZE_48_MONTHS = 'anonymize_48_months',
  SKIPPED_UNPAID_INVOICE = 'skipped_unpaid_invoice',
}

export const userCleanupAudit = Type.Object({
  id: Type.String({ format: 'uuid' }),
  userId: Type.String({ format: 'uuid' }),
  action: Type.Enum(CleanupAction),
  reason: Type.Optional(Type.String()),
  lastLoginDate: Type.Optional(Type.String()),
  executedAt: Type.String(),
});

export type UserCleanupAudit = Static<typeof userCleanupAudit>;

export type InactiveUser = {
  id: string;
  email: string;
  forename: string;
  surname: string;
  lastLogin: Date;
  archivedAt: Date | null;
  monthsInactive: number;
};
