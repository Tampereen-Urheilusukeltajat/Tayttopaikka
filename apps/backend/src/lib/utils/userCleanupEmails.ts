import { sendEmail } from '../utils/sendEmail';
import { type InactiveUser } from '../../types/userCleanup.types';
import { log } from '../utils/log';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'gdpr@tayttopaikka.fi';

/**
 * Send warning email to user 2 months before archiving (34 months inactive)
 */
export const sendInactivityWarningEmail = async (
  user: InactiveUser,
): Promise<void> => {
  const subject = 'Täyttöpaikka - Käyttäjätili arkistoidaan pian';
  const text = `Hei ${user.forename},

Täyttöpaikka-palvelun käyttäjätilisi on ollut käyttämättä ${user.monthsInactive} kuukautta.

Tietosuojakäytäntömme mukaisesti käyttäjätilit arkistoidaan automaattisesti, kun viimeisestä kirjautumisesta on kulunut kolme vuotta (36 kuukautta).

Tilisi arkistoidaan kahden kuukauden kuluttua, ellei kirjaudu palveluun ennen sitä.

Jos haluat jatkaa palvelun käyttöä, kirjaudu sisään osoitteessa: ${process.env.FRONTEND_HOSTNAME ?? 'https://tayttopaikka.fi'}

Terveisin,
Täyttöpaikka-tiimi`;

  try {
    await sendEmail({ to: user.email, subject, text });
    log.info(
      `Sent 34-month inactivity warning email to user ${user.id} (${user.email})`,
    );
  } catch (error) {
    log.error(
      `Failed to send 34-month warning email to user ${user.id}`,
      error,
    );
    throw error;
  }
};

/**
 * Send notification email when user is archived (36 months inactive)
 */
export const sendArchivedNotificationEmail = async (
  user: InactiveUser,
): Promise<void> => {
  const subject = 'Täyttöpaikka - Käyttäjätili arkistoitu';
  const text = `Hei ${user.forename},

Täyttöpaikka-palvelun käyttäjätilisi on arkistoitu automaattisesti, koska viimeisestä kirjautumisesta on kulunut yli kolme vuotta.

Tietosuojakäytäntömme mukaisesti arkistoitujen käyttäjien tiedot anonymisoidaan vuoden kuluessa, ellei käyttäjä osoita halukkuuttaan jatkaa palvelun käyttöä.

Jos haluat jatkaa palvelun käyttöä, ota yhteyttä osoitteeseen ${ADMIN_EMAIL}

Terveisin,
Täyttöpaikka-tiimi`;

  try {
    await sendEmail({ to: user.email, subject, text });
    log.info(
      `Sent archive notification email to user ${user.id} (${user.email})`,
    );
  } catch (error) {
    log.error(`Failed to send archive email to user ${user.id}`, error);
    throw error;
  }
};

/**
 * Send final warning email 1 month before anonymization (47 months since last login)
 */
export const sendFinalWarningEmail = async (
  user: InactiveUser,
): Promise<void> => {
  const subject = 'Täyttöpaikka - Käyttäjätiedot anonymisoidaan pian';
  const text = `Hei ${user.forename},

Täyttöpaikka-palvelun käyttäjätilisi on ollut arkistoituna 11 kuukautta.

Tietosuojakäytäntömme mukaisesti arkistoitujen käyttäjien tiedot anonymisoidaan vuoden kuluttua arkistoinnista, ellei käyttäjä osoita halukkuuttaan jatkaa palvelun käyttöä.

Tietosi anonymisoidaan yhden kuukauden kuluttua.

Jos haluat jatkaa palvelun käyttöä, ota yhteyttä osoitteeseen ${ADMIN_EMAIL}

Terveisin,
Täyttöpaikka-tiimi`;

  try {
    await sendEmail({ to: user.email, subject, text });
    log.info(`Sent final warning email to user ${user.id} (${user.email})`);
  } catch (error) {
    log.error(`Failed to send final warning email to user ${user.id}`, error);
    throw error;
  }
};

/**
 * Send notification to admin about user with unpaid invoices
 */
export const sendUnpaidInvoiceAdminNotification = async (
  user: InactiveUser,
  unpaidCount: number,
): Promise<void> => {
  const subject = `Täyttöpaikka - Arkistoitavalla käyttäjällä maksamattomia laskuja`;
  const text = `Hei,

Automaattinen käyttäjätilien arkistointi/anonymisointi on havainnut käyttäjän, jolla on maksamattomia laskuja:

Käyttäjä: ${user.forename} ${user.surname}
Sähköposti: ${user.email}
Käyttäjä-ID: ${user.id}
Viimeisin kirjautuminen: ${user.lastLogin.toLocaleDateString('fi-FI')}
Arkistoitu: ${user.archivedAt ? user.archivedAt.toLocaleDateString('fi-FI') : 'Ei'}
Maksamattomia täyttötapahtumia: ${unpaidCount}

Käyttäjää ei arkistoida/anonymisoida ennen kuin maksut on suoritettu.

Toimenpiteet:
1. Tarkista maksamattomat laskut järjestelmästä
2. Ota tarvittaessa yhteyttä käyttäjään
3. Suorita maksut tai merkitse ne maksetuiksi
4. Automaattinen arkistointi tapahtuu seuraavassa ajossa maksujen selvittyä

Terveisin,
Täyttöpaikka-järjestelmä`;

  try {
    await sendEmail({ to: ADMIN_EMAIL, subject, text });
    log.info(
      `Sent unpaid invoice notification to admin for user ${user.id} (${user.email})`,
    );
  } catch (error) {
    log.error(
      `Failed to send unpaid invoice admin notification for user ${user.id}`,
      error,
    );
    throw error;
  }
};
