import { type Knex } from 'knex';

/**
 * Makes oxygen_gas_price_id nullable in fill_event_diluent_fill.
 *
 * Oxygen is currently not charged for diluent fills — only helium is billed.
 * Storing NULL for oxygen_gas_price_id means "oxygen not charged on this fill".
 * If oxygen pricing is introduced in the future, populating this column and
 * updating the cost formula requires no schema change.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE fill_event_diluent_fill
      DROP FOREIGN KEY fk_fedf_oxygen_price,
      MODIFY COLUMN oxygen_gas_price_id INT UNSIGNED NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Re-add NOT NULL + FK (only safe if no NULL rows exist)
  await knex.raw(`
    ALTER TABLE fill_event_diluent_fill
      MODIFY COLUMN oxygen_gas_price_id INT UNSIGNED NOT NULL,
      ADD CONSTRAINT fk_fedf_oxygen_price
        FOREIGN KEY (oxygen_gas_price_id) REFERENCES gas_price(id)
  `);
}
