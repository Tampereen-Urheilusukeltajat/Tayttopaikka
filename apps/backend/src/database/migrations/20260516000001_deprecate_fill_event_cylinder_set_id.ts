import { type Knex } from 'knex';

/**
 * Marks fill_event.cylinder_set_id as deprecated via a column comment.
 *
 * The column is NOT dropped here — it remains as a safety net while production
 * traffic migrates to fill_event_cylinder_set. Once we are confident all reads
 * and writes go through the join table, a future migration will drop it.
 *
 * DO NOT read or write fill_event.cylinder_set_id in new code.
 * Use fill_event_cylinder_set instead.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE fill_event
      MODIFY COLUMN cylinder_set_id CHAR(36) NULL
        COMMENT 'DEPRECATED: superseded by fill_event_cylinder_set. Do not read or write in new code.'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE fill_event
      MODIFY COLUMN cylinder_set_id CHAR(36) NULL
        COMMENT ''
  `);
}
