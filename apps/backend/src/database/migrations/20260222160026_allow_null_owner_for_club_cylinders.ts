import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Make owner field nullable to support club cylinders
  // (club cylinders don't have an owner)
  await knex.schema.raw(`
    ALTER TABLE diving_cylinder_set
    MODIFY COLUMN owner CHAR(36) NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Make owner field not nullable again
  await knex.schema.raw(`
    ALTER TABLE diving_cylinder_set
    MODIFY COLUMN owner CHAR(36) NOT NULL
  `);
}
