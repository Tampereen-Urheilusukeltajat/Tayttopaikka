import { sendEmail } from '../utils/sendEmail';
import {
  type AdminNotificationRecipient,
  type RecentlyRegisteredUser,
} from '../queries/user';
import { log } from '../utils/log';

const FRONTEND_HOSTNAME = process.env.FRONTEND_HOSTNAME;

if (!FRONTEND_HOSTNAME) {
  throw new Error('FRONTEND_HOSTNAME environment variable is required');
}

const ADMIN_USERS_URL = `https://${FRONTEND_HOSTNAME}/admin/users?isUser=false`;

const formatFinnishDateTime = (date: Date): string =>
  date.toLocaleString('fi-FI', {
    timeZone: 'Europe/Helsinki',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const buildUserBlock = (user: RecentlyRegisteredUser): string =>
  `Nimi: ${user.forename} ${user.surname}\nSähköposti: ${user.email}\nRekisteröitynyt: ${formatFinnishDateTime(user.createdAt)}`;

export const sendNewUserDigestEmail = async (
  recipient: AdminNotificationRecipient,
  newUsers: RecentlyRegisteredUser[],
): Promise<void> => {
  const subject = 'Täyttöpaikkaan on rekistöröitynyt uusia käyttäjiä';
  const count = newUsers.length;
  const userList = newUsers.map(buildUserBlock).join('\n\n');

  const text = `Hei ${recipient.forename},

Täyttöpaikkaan on rekisteröitynyt ${count === 1 ? 'uusi käyttäjä' : `${count} uutta käyttäjää`}:

${userList}

Siirry käyttäjähallintaan: ${ADMIN_USERS_URL}

Terveisin,
Täyttöpaikka-järjestelmä`;

  try {
    await sendEmail({ to: recipient.email, subject, text });
    log.info(
      `Sent new user digest email to admin ${recipient.id} (${recipient.email})`,
    );
  } catch (error) {
    log.error(
      `Failed to send new user digest email to admin ${recipient.id}`,
      error,
    );
    throw error;
  }
};
