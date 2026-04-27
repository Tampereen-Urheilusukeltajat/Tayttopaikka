import { type Knex } from 'knex';

/**
 * Adds database-level constraints to gas_price that were previously enforced
 * only in application code:
 *
 * 1. UNIQUE (gas_id, active_from) — no two prices for the same gas can start
 *    at the same time.
 *
 * 2. UNIQUE (gas_id, active_to) — enforces at most one open-ended price per
 *    gas (i.e. active_to = '9999-12-31 23:59:59'). This is the key invariant:
 *    a gas can have at most one current or future price at any time.
 *
 * 3. CHECK (price_eur_cents >= 0) — restores the non-negative constraint that
 *    was implicitly provided by the original `unsigned integer` column type but
 *    was lost when the column was changed to FLOAT in migration
 *    20230823151526_floating_price.ts.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE gas_price
      ADD UNIQUE KEY uq_gas_price_gas_active_from (gas_id, active_from),
      ADD UNIQUE KEY uq_gas_price_gas_active_to (gas_id, active_to),
      ADD CONSTRAINT chk_gas_price_non_negative CHECK (price_eur_cents >= 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE gas_price
      DROP INDEX uq_gas_price_gas_active_from,
      DROP INDEX uq_gas_price_gas_active_to,
      DROP CONSTRAINT chk_gas_price_non_negative
  `);
}
