import { sendEmail } from './sendEmail';
import { type UserResponse } from '../../types/user.types';
import { log } from './log';

const FRONTEND_HOSTNAME = process.env.FRONTEND_HOSTNAME;

if (!FRONTEND_HOSTNAME) {
  throw new Error('FRONTEND_HOSTNAME environment variable is required');
}

const LOGIN_URL = `https://${FRONTEND_HOSTNAME}/login`;

const buildActivationEmail = (
  user: UserResponse,
): { subject: string; text: string } => ({
  subject: 'Käyttäjätilisi on aktivoitu',
  text: `Hei ${user.forename},

Ylläpitäjä on aktivoinut käyttäjätilisi Täyttöpaikka-palvelussa. Voit nyt kirjautua sisään ja käyttää sovellusta.

Jos olet jo kirjautuneena sisään, kirjaudu ensin ulos ja sen jälkeen takaisin sisään, jotta uudet oikeutesi tulevat voimaan.

Kirjaudu sisään: ${LOGIN_URL}

Terveisin,
Täyttöpaikka-järjestelmä`,
});

const buildDeactivationEmail = (
  user: UserResponse,
): { subject: string; text: string } => ({
  subject: 'Käyttöoikeutesi on poistettu',
  text: `Hei ${user.forename},

Ylläpitäjä on poistanut käyttöoikeutesi Täyttöpaikka-palvelusta. Et voi enää kirjautua sisään sovellukseen.

Mikäli tämä on mielestäsi virhe, ole hyvä ja ota yhteyttä seuran ylläpitoon.

Terveisin,
Täyttöpaikka-järjestelmä`,
});

export const sendUserStatusChangedEmail = async (
  user: UserResponse,
  isActivated: boolean,
): Promise<void> => {
  const { subject, text } = isActivated
    ? buildActivationEmail(user)
    : buildDeactivationEmail(user);

  try {
    await sendEmail({ to: user.email, subject, text });
    log.info(
      `Sent ${isActivated ? 'activation' : 'deactivation'} email to user ${user.id} (${user.email})`,
    );
  } catch (error) {
    log.error(
      `Failed to send ${isActivated ? 'activation' : 'deactivation'} email to user ${user.id}`,
      error,
    );
    throw error;
  }
};
