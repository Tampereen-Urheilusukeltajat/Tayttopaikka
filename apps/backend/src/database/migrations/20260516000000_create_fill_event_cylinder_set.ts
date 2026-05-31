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
  // Pre-check: every fill_event must have a non-null cylinder_set_id.
  // If any are null it means production data is in an unexpected state and
  // the migration should be aborted rather than silently skipping those rows.
  const [nullRows] = await knex.raw<[Array<{ count: string }>]>(
    'SELECT COUNT(*) as count FROM fill_event WHERE cylinder_set_id IS NULL',
  );
  if (Number(nullRows[0].count) > 0) {
    throw new Error(
      `Migration aborted: ${String(nullRows[0].count)} fill_event row(s) have NULL cylinder_set_id. ` +
        'Expected zero — investigate before re-running.',
    );
  }

  const [totalFillEvents] = await knex.raw<[Array<{ count: string }>]>(
    'SELECT COUNT(*) as count FROM fill_event',
  );

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

  // Post-check: the backfill must have produced exactly one join-table row per
  // fill event. A mismatch means the INSERT was incomplete or data is corrupt.
  const [joinRows] = await knex.raw<[Array<{ count: string }>]>(
    'SELECT COUNT(*) as count FROM fill_event_cylinder_set',
  );
  if (Number(joinRows[0].count) !== Number(totalFillEvents[0].count)) {
    throw new Error(
      `Migration aborted: fill_event has ${String(totalFillEvents[0].count)} row(s) but ` +
        `fill_event_cylinder_set has ${String(joinRows[0].count)} row(s) after backfill. ` +
        'Expected counts to be equal.',
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS fill_event_cylinder_set');
}
