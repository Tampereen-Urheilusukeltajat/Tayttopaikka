import { type Knex } from 'knex';

/* eslint-disable no-console */

/**
 * Development seed data
 * Populates compressor, gas_price, and storage_cylinder tables with initial data
 */
export async function seed(knex: Knex): Promise<void> {
  // Clean up existing data (in reverse order of dependencies)
  await knex('storage_cylinder').del();
  await knex('compressor').del();
  // Don't delete gas_price entries, we'll update them instead

  // Get gas IDs
  const gases = await knex('gas').select('id', 'name');
  const gasMap = Object.fromEntries(
    gases.map((gas) => [gas.name, gas.id]),
  ) as Record<string, number>;

  // Insert compressors
  // Two air_only compressors and one mixed-gas compressor
  await knex('compressor').insert([
    {
      id: knex.raw('UUID()'),
      name: 'Air Compressor 1',
      description: 'Primary air-only compressor',
      air_only: true,
      is_enabled: true,
    },
    {
      id: knex.raw('UUID()'),
      name: 'Air Compressor 2',
      description: 'Secondary air-only compressor',
      air_only: true,
      is_enabled: true,
    },
    {
      id: knex.raw('UUID()'),
      name: 'Nitrox/Trimix Compressor',
      description: 'Mixed-gas compressor for enriched air and trimix',
      air_only: false,
      is_enabled: true,
    },
  ]);

  // Update gas prices
  // Get current active gas prices
  const currentPrices = await knex('gas_price')
    .select('id', 'gas_id')
    .where('active_to', '9999-12-31 23:59:59');

  // Define the new prices (in EUR, will be converted to cents)
  const gasPrices = {
    Air: 0,
    Helium: 0.06,
    Oxygen: 0.006,
    Argon: 0.015,
    Diluent: 0.021,
  };

  // Update existing prices or insert new ones
  for (const [gasName, priceEur] of Object.entries(gasPrices)) {
    const gasId = gasMap[gasName];
    if (!gasId) {
      console.warn(`Gas "${gasName}" not found in database, skipping...`);
      continue;
    }

    const priceCents = Math.round(priceEur * 100);
    const existingPrice = currentPrices.find((p) => p.gas_id === gasId);

    if (existingPrice) {
      // Update existing price
      await knex('gas_price')
        .where('id', existingPrice.id as number)
        .update({ price_eur_cents: priceCents });
    } else {
      // Insert new price
      await knex('gas_price').insert({
        gas_id: gasId,
        price_eur_cents: priceCents,
        active_from: knex.fn.now(),
        active_to: '9999-12-31 23:59:59',
      });
    }
  }

  // Insert storage cylinders
  const storageCylinders = [
    // Two 50L oxygen cylinders
    {
      gas_id: gasMap.Oxygen,
      volume: 50,
      max_pressure: 200,
      name: 'Oxygen Storage 1',
    },
    {
      gas_id: gasMap.Oxygen,
      volume: 50,
      max_pressure: 200,
      name: 'Oxygen Storage 2',
    },
    // Four 50L helium cylinders
    {
      gas_id: gasMap.Helium,
      volume: 50,
      max_pressure: 200,
      name: 'Helium Storage 1',
    },
    {
      gas_id: gasMap.Helium,
      volume: 50,
      max_pressure: 200,
      name: 'Helium Storage 2',
    },
    {
      gas_id: gasMap.Helium,
      volume: 50,
      max_pressure: 200,
      name: 'Helium Storage 3',
    },
    {
      gas_id: gasMap.Helium,
      volume: 50,
      max_pressure: 200,
      name: 'Helium Storage 4',
    },
    // One 40L argon cylinder
    {
      gas_id: gasMap.Argon,
      volume: 40,
      max_pressure: 200,
      name: 'Argon Storage 1',
    },
    // One 40L diluent cylinder
    {
      gas_id: gasMap.Diluent,
      volume: 40,
      max_pressure: 200,
      name: 'Diluent Storage 1',
    },
  ];

  await knex('storage_cylinder').insert(storageCylinders);

  console.log('✅ Development seed data inserted successfully');
  console.log('  - 3 compressors added');
  console.log('  - 5 gas prices updated');
  console.log('  - 8 storage cylinders added');
}
