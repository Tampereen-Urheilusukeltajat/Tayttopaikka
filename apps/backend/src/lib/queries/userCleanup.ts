import { type Knex } from 'knex';
import { knexController } from '../../database/database';
import {
  CleanupAction,
  type InactiveUser,
  type UserCleanupAudit,
  type ArchivedUserInfo,
} from '../../types/userCleanup.types';
import { type DBResponse } from '../../types/general.types';
import { getUnpaidFillEvents } from './payment';

/**
 * Get users who have been inactive for a specified number of months
 * @param monthsInactive - Number of months since last login
 * @param excludeArchived - Whether to exclude archived users
 * @param excludeDeleted - Whether to exclude deleted users
 */
export const getInactiveUsers = async (
  monthsInactive: number,
  excludeArchived = false,
  excludeDeleted = true,
): Promise<InactiveUser[]> => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.forename,
      u.surname,
      u.last_login AS lastLogin,
      u.archived_at AS archivedAt,
      TIMESTAMPDIFF(MONTH, u.last_login, NOW()) AS monthsInactive
    FROM user u
    WHERE
      TIMESTAMPDIFF(MONTH, u.last_login, NOW()) >= :monthsInactive
      ${excludeArchived ? 'AND u.archived_at IS NULL' : ''}
      ${excludeDeleted ? 'AND u.deleted_at IS NULL' : ''}
    ORDER BY u.last_login ASC
  `;

  const [users] = await knexController.raw<DBResponse<InactiveUser[]>>(query, {
    monthsInactive,
  });

  return users;
};

/**
 * Get users whose archived_at timestamp is older than specified months
 * @param monthsSinceArchive - Number of months since archive
 */
export const getUsersArchivedForMonths = async (
  monthsSinceArchive: number,
): Promise<InactiveUser[]> => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.forename,
      u.surname,
      u.last_login AS lastLogin,
      u.archived_at AS archivedAt,
      TIMESTAMPDIFF(MONTH, u.archived_at, NOW()) AS monthsSinceArchive
    FROM user u
    WHERE
      u.archived_at IS NOT NULL
      AND u.deleted_at IS NULL
      AND TIMESTAMPDIFF(MONTH, u.archived_at, NOW()) >= :monthsSinceArchive
    ORDER BY u.archived_at ASC
  `;

  const [users] = await knexController.raw<DBResponse<InactiveUser[]>>(query, {
    monthsSinceArchive,
  });

  return users;
};

/**
 * Check if user has unpaid invoices
 */
export const userHasUnpaidInvoices = async (
  userId: string,
): Promise<boolean> => {
  const unpaidInvoices = await getUnpaidFillEvents(userId);
  return unpaidInvoices.length > 0;
};

/**
 * Log a cleanup action to the audit table
 */
export const logCleanupAction = async (
  userId: string,
  action: CleanupAction,
  reason: string,
  lastLoginDate: Date | null,
  trx?: Knex.Transaction,
  performedByUserId?: string,
): Promise<void> => {
  const db = trx ?? knexController;

  await db('user_cleanup_audit').insert({
    user_id: userId,
    action,
    reason,
    last_login_date: lastLoginDate,
    executed_at: db.fn.now(),
    performed_by_user_id: performedByUserId ?? null,
  });
};

/**
 * Check if a cleanup action has already been performed for a user
 */
export const hasCleanupActionBeenPerformed = async (
  userId: string,
  action: CleanupAction,
): Promise<boolean> => {
  const result = await knexController('user_cleanup_audit')
    .where({ user_id: userId, action })
    .first();

  return result !== undefined;
};

/**
 * Archive a user by setting archived_at timestamp
 */
export const archiveUserForCleanup = async (
  userId: string,
  trx?: Knex.Transaction,
): Promise<void> => {
  const db = trx ?? knexController;

  await db('user')
    .where({ id: userId, deleted_at: null })
    .update({ archived_at: db.fn.now() });
};

/**
 * Anonymize a user by setting deleted_at and clearing PII
 * This follows the same pattern as deleteUser but is called from cleanup
 */
export const anonymizeUserForCleanup = async (
  userId: string,
  trx?: Knex.Transaction,
): Promise<void> => {
  const db = trx ?? knexController;

  await db('user').where({ id: userId }).update({
    email: null,
    phone_number: null,
    forename: null,
    surname: null,
    deleted_at: db.fn.now(),
  });

  // Archive associated diving cylinder sets
  await db('diving_cylinder_set')
    .where({ owner: userId })
    .update({ archived: true });
};

/**
 * Get all archived users (not yet anonymized) with detailed information
 * Includes unpaid invoices count for each user
 */
export const getArchivedUsersWithDetails = async (): Promise<
  ArchivedUserInfo[]
> => {
  const query = `
    SELECT
      u.id,
      u.email,
      u.forename,
      u.surname,
      u.last_login AS lastLogin,
      u.archived_at AS archivedAt,
      TIMESTAMPDIFF(MONTH, u.last_login, NOW()) AS monthsInactive,
      (
        SELECT COUNT(*)
        FROM fill_event fe
        WHERE fe.user_id = u.id
          AND NOT EXISTS (
            SELECT 1
            FROM fill_event_payment_event fepe
            JOIN payment_event pe ON pe.id = fepe.payment_event_id
            WHERE fepe.fill_event_id = fe.id
              AND pe.status = 'COMPLETED'
          )
      ) AS unpaidInvoicesCount
    FROM user u
    WHERE
      u.archived_at IS NOT NULL
      AND u.deleted_at IS NULL
    ORDER BY u.archived_at DESC
  `;

  const [users] =
    await knexController.raw<DBResponse<ArchivedUserInfo[]>>(query);

  return users;
};

/**
 * Unarchive a user by clearing archived_at and restoring their cylinder sets
 * @param userId - The ID of the user to unarchive
 * @param performedByUserId - The ID of the admin user performing the unarchive
 * @param trx - Optional transaction
 */
export const unarchiveUser = async (
  userId: string,
  performedByUserId: string,
  trx?: Knex.Transaction,
): Promise<void> => {
  const db = trx ?? knexController;

  // Verify user exists and is archived but not anonymized
  const user = await db('user')
    .where({
      id: userId,
      deleted_at: null,
    })
    .whereNotNull('archived_at')
    .first();

  if (!user) {
    throw new Error('User not found, not archived, or already anonymized');
  }

  // Clear archived_at timestamp
  await db('user').where({ id: userId }).update({ archived_at: null });

  // Restore associated diving cylinder sets
  await db('diving_cylinder_set')
    .where({ owner: userId })
    .update({ archived: false });

  // Log the unarchive action
  await logCleanupAction(
    userId,
    CleanupAction.UNARCHIVE,
    `User manually unarchived by admin. Previous archive date: ${user.archived_at}`,
    user.last_login,
    trx,
    performedByUserId,
  );
};
