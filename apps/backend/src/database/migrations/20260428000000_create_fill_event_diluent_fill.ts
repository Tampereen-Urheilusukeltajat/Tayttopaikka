import { type Knex } from 'knex';

/**
 * Creates the fill_event_diluent_fill table for diluent cylinder fills.
 *
 * Diluent is a mix of helium, oxygen and nitrogen. The club buys helium and
 * oxygen; nitrogen is free. The price is calculated from the helium and oxygen
 * percentages of the mix at the time of fill.
 *
 * Unlike regular gas fills (fill_event_gas_fill), there is no single gas_price
 * row to reference — the price depends on composition. We store:
 *   - the O2 and He percentages as input to the calculation
 *   - the gas_price rows for O2 and He that were active at fill time (for audit)
 *   - the pre-computed price_eur_cents per litre so invoice queries stay simple
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE fill_event_diluent_fill (
      id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
      fill_event_id       INT UNSIGNED NOT NULL,
      storage_cylinder_id INT UNSIGNED NOT NULL,
      volume_litres       FLOAT        NOT NULL,
      oxygen_percentage   FLOAT        NOT NULL,
      helium_percentage   FLOAT        NOT NULL,
      oxygen_gas_price_id INT UNSIGNED NOT NULL,
      helium_gas_price_id INT UNSIGNED NOT NULL,
      price_eur_cents     DECIMAL(12,2) NOT NULL,
      created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_fedf_fill_event       FOREIGN KEY (fill_event_id)       REFERENCES fill_event(id),
      CONSTRAINT fk_fedf_storage_cylinder FOREIGN KEY (storage_cylinder_id) REFERENCES storage_cylinder(id),
      CONSTRAINT fk_fedf_oxygen_price     FOREIGN KEY (oxygen_gas_price_id) REFERENCES gas_price(id),
      CONSTRAINT fk_fedf_helium_price     FOREIGN KEY (helium_gas_price_id) REFERENCES gas_price(id),
      CONSTRAINT chk_fedf_oxygen_range    CHECK (oxygen_percentage >= 0 AND oxygen_percentage <= 100),
      CONSTRAINT chk_fedf_helium_range    CHECK (helium_percentage >= 0 AND helium_percentage <= 100),
      CONSTRAINT chk_fedf_mix_total       CHECK (oxygen_percentage + helium_percentage <= 100)
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS fill_event_diluent_fill');
}
