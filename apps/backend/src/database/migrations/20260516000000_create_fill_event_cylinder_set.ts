import { type Knex } from 'knex';

/**
 * Introduces fill_event_cylinder_set, a join table that replaces the single
 * fill_event.cylinder_set_id column.
 *
 * Background: a blender often fills multiple cylinder sets in a single session
 * without recording intermediate storage cylinder pressures. Previously each
 * set required its own fill event. This table allows one fill event (with its
 * storage cylinder gas consumption) to be linked to many cylinder sets.
 *
 * Migration steps:
 *   1. Create the join table.
 *   2. Backfill from fill_event.cylinder_set_id so no historical data is lost.
 *
 * fill_event.cylinder_set_id is left in place but deprecated — see the
 * following migration (20260516000001_deprecate_fill_event_cylinder_set_id).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE fill_event_cylinder_set (
      fill_event_id   INT UNSIGNED NOT NULL,
      cylinder_set_id CHAR(36)     NOT NULL,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (fill_event_id, cylinder_set_id),
      CONSTRAINT fk_fecs_fill_event
        FOREIGN KEY (fill_event_id)   REFERENCES fill_event(id),
      CONSTRAINT fk_fecs_cylinder_set
        FOREIGN KEY (cylinder_set_id) REFERENCES diving_cylinder_set(id)
    )
  `);

  // Backfill: every existing fill event that had a cylinder set gets a row in
  // the new join table. Events with NULL cylinder_set_id (e.g. guest fills) are
  // intentionally excluded.
  await knex.raw(`
    INSERT INTO fill_event_cylinder_set (fill_event_id, cylinder_set_id)
    SELECT id, cylinder_set_id
    FROM fill_event
    WHERE cylinder_set_id IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS fill_event_cylinder_set');
}
