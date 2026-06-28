import cron from 'node-cron';
import { log } from '../utils/log';
import { runUserCleanup } from '../services/userCleanupService';
import { runNewUserNotification } from '../services/newUserNotificationService';

const CLEANUP_ENABLED = process.env.USER_CLEANUP_ENABLED !== 'false';
const NEW_USER_NOTIFICATION_ENABLED =
  process.env.NEW_USER_NOTIFICATION_ENABLED !== 'false';

export const initializeScheduler = (): void => {
  if (CLEANUP_ENABLED) {
    // Run user cleanup on the 1st of each month at 2:00 AM
    // Cron syntax: minute hour day-of-month month day-of-week
    cron.schedule(
      '0 2 1 * *',
      async () => {
        log.info('Scheduled user cleanup job triggered');
        try {
          await runUserCleanup();
        } catch (error) {
          log.error('Scheduled user cleanup job failed', error);
        }
      },
      { timezone: 'Europe/Helsinki' },
    );
    log.info(
      'User cleanup scheduled for 1st of each month at 2:00 AM (Europe/Helsinki)',
    );
  } else {
    log.info('User cleanup scheduler is disabled');
  }

  if (NEW_USER_NOTIFICATION_ENABLED) {
    // Notify admins of new registrations daily at 7:00 PM
    cron.schedule(
      '0 19 * * *',
      async () => {
        log.info('Scheduled new user notification job triggered');
        try {
          await runNewUserNotification();
        } catch (error) {
          log.error('Scheduled new user notification job failed', error);
        }
      },
      { timezone: 'Europe/Helsinki' },
    );
    log.info(
      'New user notification scheduled for daily at 7:00 PM (Europe/Helsinki)',
    );
  } else {
    log.info('New user notification scheduler is disabled');
  }
};
