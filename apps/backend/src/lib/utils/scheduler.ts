import cron from 'node-cron';
import { log } from '../utils/log';
import { runUserCleanup } from '../services/userCleanupService';

const CLEANUP_ENABLED = process.env.USER_CLEANUP_ENABLED !== 'false';

/**
 * Initialize scheduled jobs for the application
 */
export const initializeScheduler = (): void => {
  if (!CLEANUP_ENABLED) {
    log.info('User cleanup scheduler is disabled');
    return;
  }

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
    {
      timezone: 'Europe/Helsinki',
    },
  );

  log.info(
    'User cleanup scheduled for 1st of each month at 2:00 AM (Europe/Helsinki)',
  );
};
