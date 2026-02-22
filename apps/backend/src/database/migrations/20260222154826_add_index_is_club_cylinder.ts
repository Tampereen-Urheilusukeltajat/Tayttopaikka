import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX idx_diving_cylinder_set_is_club_cylinder 
    ON diving_cylinder_set(is_club_cylinder);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS idx_diving_cylinder_set_is_club_cylinder;
  `);
}
