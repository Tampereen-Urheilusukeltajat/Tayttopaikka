import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE site_notice (
      id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
      message              TEXT NOT NULL,
      show_logbook         BOOLEAN NOT NULL DEFAULT FALSE,
      show_blender_logbook BOOLEAN NOT NULL DEFAULT FALSE,
      active_from          DATETIME NOT NULL,
      active_to            DATETIME NULL,
      created_by           CHAR(36) NOT NULL,
      created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_site_notice_user FOREIGN KEY (created_by) REFERENCES user (id)
    )
  `);
}

export async function down(_knex: Knex): Promise<void> {
  // No-op — rollbacks are handled manually
}
