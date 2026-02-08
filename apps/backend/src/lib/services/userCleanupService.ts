import { log } from '../utils/log';
import {
  getInactiveUsers,
  getUsersArchivedForMonths,
  userHasUnpaidInvoices,
  logCleanupAction,
  hasCleanupActionBeenPerformed,
  archiveUserForCleanup,
  anonymizeUserForCleanup,
} from '../queries/userCleanup';
import { getUnpaidFillEvents } from '../queries/payment';
import {
  sendInactivityWarningEmail,
  sendArchivedNotificationEmail,
  sendUnpaidInvoiceAdminNotification,
} from '../utils/userCleanupEmails';
import { CleanupAction } from '../../types/userCleanup.types';
import { knexController } from '../../database/database';

/**
 * Process users who have been inactive for 34 months
 * Send warning email that account will be archived in 2 months
 */
const processUsersAt34Months = async (): Promise<void> => {
  log.info('Processing users at 34 months of inactivity...');

  const users = await getInactiveUsers(34, true, true);
  log.info(`Found ${users.length} users inactive for 34+ months`);

  for (const user of users) {
    try {
      // Check if we've already sent this warning
      const alreadyWarned = await hasCleanupActionBeenPerformed(
        user.id,
        CleanupAction.WARN_34_MONTHS,
      );

      if (alreadyWarned) {
        log.debug(`User ${user.id} already warned at 34 months, skipping`);
        continue;
      }

      // Send warning email
      await sendInactivityWarningEmail(user);

      // Log action
      await logCleanupAction(
        user.id,
        CleanupAction.WARN_34_MONTHS,
        `Sent 34-month inactivity warning. Last login: ${user.lastLogin.toISOString()}`,
        user.lastLogin,
      );

      log.info(`Successfully processed 34-month warning for user ${user.id}`);
    } catch (error) {
      log.error(
        `Failed to process 34-month warning for user ${user.id}`,
        error,
      );
      // Continue with next user even if one fails
    }
  }
};

/**
 * Process users who have been inactive for 36 months
 * Archive their account and send notification
 */
const processUsersAt36Months = async (): Promise<void> => {
  log.info('Processing users at 36 months of inactivity...');

  const users = await getInactiveUsers(36, true, true);
  log.info(`Found ${users.length} users inactive for 36+ months`);

  for (const user of users) {
    const transaction = await knexController.transaction();

    try {
      // Check if we've already archived this user
      const alreadyArchived = await hasCleanupActionBeenPerformed(
        user.id,
        CleanupAction.ARCHIVE_36_MONTHS,
      );

      if (alreadyArchived) {
        log.debug(`User ${user.id} already archived, skipping`);
        await transaction.rollback();
        continue;
      }

      // Check for unpaid invoices
      const hasUnpaidInvoices = await userHasUnpaidInvoices(user.id);

      if (hasUnpaidInvoices) {
        log.warn(
          `User ${user.id} has unpaid invoices, skipping archive and notifying admin`,
        );

        const unpaidInvoices = await getUnpaidFillEvents(user.id);
        await sendUnpaidInvoiceAdminNotification(user, unpaidInvoices.length);

        await logCleanupAction(
          user.id,
          CleanupAction.SKIPPED_UNPAID_INVOICE,
          `User has ${unpaidInvoices.length} unpaid invoices. Last login: ${user.lastLogin.toISOString()}`,
          user.lastLogin,
          transaction,
        );

        await transaction.commit();
        continue;
      }

      // Archive the user
      await archiveUserForCleanup(user.id, transaction);

      // Send notification email
      await sendArchivedNotificationEmail(user);

      // Log action
      await logCleanupAction(
        user.id,
        CleanupAction.ARCHIVE_36_MONTHS,
        `User archived after 36 months of inactivity. Last login: ${user.lastLogin.toISOString()}`,
        user.lastLogin,
        transaction,
      );

      await transaction.commit();
      log.info(`Successfully archived user ${user.id}`);
    } catch (error) {
      await transaction.rollback();
      log.error(`Failed to archive user ${user.id}`, error);
      // Continue with next user even if one fails
    }
  }
};

/**
 * Process users who have been archived for 12 months
 * Anonymize their data
 */
const processUsersAt48Months = async (): Promise<void> => {
  log.info('Processing users archived for 12 months...');

  const users = await getUsersArchivedForMonths(12);
  log.info(`Found ${users.length} users archived for 12+ months`);

  for (const user of users) {
    const transaction = await knexController.transaction();

    try {
      // Check if we've already anonymized this user
      const alreadyAnonymized = await hasCleanupActionBeenPerformed(
        user.id,
        CleanupAction.ANONYMIZE_48_MONTHS,
      );

      if (alreadyAnonymized) {
        log.debug(`User ${user.id} already anonymized, skipping`);
        await transaction.rollback();
        continue;
      }

      // Check for unpaid invoices
      const hasUnpaidInvoices = await userHasUnpaidInvoices(user.id);

      if (hasUnpaidInvoices) {
        log.warn(
          `User ${user.id} has unpaid invoices, skipping anonymization and notifying admin`,
        );

        const unpaidInvoices = await getUnpaidFillEvents(user.id);
        await sendUnpaidInvoiceAdminNotification(user, unpaidInvoices.length);

        await logCleanupAction(
          user.id,
          CleanupAction.SKIPPED_UNPAID_INVOICE,
          `User has ${unpaidInvoices.length} unpaid invoices. Admin notified. Archived at: ${user.archivedAt?.toISOString()}`,
          user.lastLogin,
          transaction,
        );

        await transaction.commit();
        continue;
      }

      // Anonymize the user
      await anonymizeUserForCleanup(user.id, transaction);

      // Log action
      await logCleanupAction(
        user.id,
        CleanupAction.ANONYMIZE_48_MONTHS,
        `User anonymized after 12 months of being archived. Archived at: ${user.archivedAt?.toISOString()}`,
        user.lastLogin,
        transaction,
      );

      await transaction.commit();
      log.info(`Successfully anonymized user ${user.id}`);
    } catch (error) {
      await transaction.rollback();
      log.error(`Failed to anonymize user ${user.id}`, error);
      // Continue with next user even if one fails
    }
  }
};

/**
 * Main cleanup job that processes all inactive users
 * This should be run on a scheduled basis (monthly)
 */
export const runUserCleanup = async (): Promise<void> => {
  const startTime = Date.now();
  log.info('Starting user cleanup job');

  try {
    await processUsersAt34Months();
    await processUsersAt36Months();
    await processUsersAt48Months();

    const duration = Date.now() - startTime;
    log.info(`User cleanup job completed in ${duration}ms`);
  } catch (error) {
    log.error('User cleanup job failed with error', error);
    throw error;
  }
};
