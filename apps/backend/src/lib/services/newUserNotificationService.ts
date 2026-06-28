import { log } from '../utils/log';
import { getAdminUsers, getRecentlyRegisteredUsers } from '../queries/user';
import { sendNewUserDigestEmail } from '../utils/newUserNotificationEmails';

export const runNewUserNotification = async (): Promise<void> => {
  const newUsers = await getRecentlyRegisteredUsers();

  if (newUsers.length === 0) {
    log.info('No new registrations in the last 24 hours, skipping notification');
    return;
  }

  log.info(`Found ${newUsers.length} new registration(s) in the last 24 hours`);

  const admins = await getAdminUsers();

  if (admins.length === 0) {
    log.warn('No admin users found, skipping new user notification');
    return;
  }

  for (const admin of admins) {
    try {
      await sendNewUserDigestEmail(admin, newUsers);
    } catch (error) {
      log.error(
        `Failed to send new user notification to admin ${admin.id}`,
        error,
      );
    }
  }
};
