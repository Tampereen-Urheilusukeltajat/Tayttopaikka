import {
  describe,
  test,
  before,
  after,
  beforeEach,
  afterEach,
} from 'node:test';
import assert from 'node:assert';
import { type FastifyInstance } from 'fastify';
import {
  createTestDatabase,
  dropTestDatabase,
  startRedisConnection,
  stopRedisConnection,
  getTestKnex,
} from '../../../lib/utils/testUtils';
import { buildServer } from '../../../server';
import { type Invoice } from '../../../types/invoices.types';
import {
  calcDiluentFillCostCents,
  calcGasFillCostCents,
  calcTotalFillCostCents,
  calculateVolumeLitres,
} from '@tayttopaikka/pricing';

/**
 * Verifies that the SQL in getUnpaidFillEvents / calculateFillEventTotalPrice
 * produces the same results as the @tayttopaikka/pricing library, and that
 * invoiceTotal always equals the sum of its invoiceRow prices.
 *
 * Seed data (invoice_e2e):
 *   gas_price id=13: Oxygen at 0.6 c/L
 *   gas_price id=12: Helium at 6 c/L
 *   storage_cylinder id=5:  Oxygen  50L
 *   storage_cylinder id=11: Diluent 50L
 *   blender user:  test@email.fi
 *   admin user:    admin@XD.fi
 *   cylinder set:  a4e1035e-f36e-4056-9a1b-5925a3c5793e
 */
describe('Pricing consistency: library vs SQL', () => {
  const CYLINDER_SET_ID = 'a4e1035e-f36e-4056-9a1b-5925a3c5793e';
  const O2_GAS_PRICE_ID = 13;
  const O2_PRICE_DEFAULT = 0.6; // c/L
  const O2_PRICE_FRACTIONAL = 0.9; // c/L — reproduces the original floating-point bug
  const HE_PRICE = 6; // c/L
  const SC_OXYGEN_VOLUME = 50; // litres
  const SC_DILUENT_VOLUME = 50; // litres

  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({ knex: getTestKnex(), routePrefix: 'api' });

  before(async () => {
    await createTestDatabase('invoice_e2e');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server: FastifyInstance;
  let blenderHeaders: { Authorization: string };
  let adminHeaders: { Authorization: string };

  beforeEach(async () => {
    server = await getTestInstance();

    const blenderLogin = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: { email: 'test@email.fi', password: 'password' },
    });
    blenderHeaders = {
      Authorization: 'Bearer ' + String(JSON.parse(blenderLogin.body).accessToken),
    };

    const adminLogin = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: { email: 'admin@XD.fi', password: 'password' },
    });
    adminHeaders = {
      Authorization: 'Bearer ' + String(JSON.parse(adminLogin.body).accessToken),
    };
  });

  afterEach(async () => {
    // Reset O2 price to default so each test starts clean
    await getTestKnex()('gas_price')
      .where('id', O2_GAS_PRICE_ID)
      .update({ price_eur_cents: O2_PRICE_DEFAULT });

    await getTestKnex()('fill_event_diluent_fill').del();
    await getTestKnex()('fill_event_gas_fill').del();
    await getTestKnex()('fill_event_payment_event').del();
    await getTestKnex()('payment_event').del();
    await getTestKnex()('fill_event').del();
    await server.close();
  });

  const postFill = async (body: object): Promise<number> => {
    const res = await server.inject({
      url: 'api/fill-event',
      method: 'POST',
      body,
      headers: blenderHeaders,
    });
    assert.strictEqual(res.statusCode, 201, `fill creation failed: ${res.body}`);
    return (JSON.parse(res.body) as { id: number }).id;
  };

  const getInvoice = async (): Promise<Invoice> => {
    const res = await server.inject({
      headers: adminHeaders,
      method: 'GET',
      url: 'api/invoicing',
    });
    assert.strictEqual(res.statusCode, 200);
    const invoices = JSON.parse(res.body) as Invoice[];
    assert.strictEqual(invoices.length, 1, 'expected exactly one invoice');
    return invoices[0];
  };

  test('invoiceTotal equals sum of row prices for a single gas fill', async () => {
    // sc5: O2 50L, 10→8 bar → ceil(2)*50 = 100L × 0.6 = 60 cents
    const libraryPrice = calcTotalFillCostCents(
      [calcGasFillCostCents(calculateVolumeLitres(SC_OXYGEN_VOLUME, 10, 8), O2_PRICE_DEFAULT)],
      [],
    );
    assert.strictEqual(libraryPrice, 60);

    await postFill({
      cylinderSetId: CYLINDER_SET_ID,
      gasMixture: 'EAN32',
      filledAir: false,
      storageCylinderUsageArr: [
        { storageCylinderId: 5, startPressure: 10, endPressure: 8 },
      ],
      price: libraryPrice,
    });

    const invoice = await getInvoice();
    assert.strictEqual(invoice.invoiceRows.length, 1);
    assert.strictEqual(invoice.invoiceRows[0].price, libraryPrice);
    assert.strictEqual(invoice.invoiceTotal, libraryPrice);
  });

  test('invoiceTotal equals sum of row prices for a single diluent fill', async () => {
    // sc11: Diluent 50L, 40% He, 10→8 bar → ceil(2)*50 = 100L
    // price = ceil(0.40 × 6 × 100) = 240 cents
    const libraryPrice = calcTotalFillCostCents(
      [],
      [calcDiluentFillCostCents(
        calculateVolumeLitres(SC_DILUENT_VOLUME, 10, 8), 40, HE_PRICE,
      )],
    );
    assert.strictEqual(libraryPrice, 240);

    await postFill({
      cylinderSetId: CYLINDER_SET_ID,
      gasMixture: 'TMX 20/40',
      filledAir: false,
      storageCylinderUsageArr: [],
      diluentCylinderUsageArr: [
        { storageCylinderId: 11, startPressure: 10, endPressure: 8, oxygenPercentage: 20, heliumPercentage: 40 },
      ],
      price: libraryPrice,
    });

    const invoice = await getInvoice();
    assert.strictEqual(invoice.invoiceRows.length, 1);
    assert.strictEqual(invoice.invoiceRows[0].price, libraryPrice);
    assert.strictEqual(invoice.invoiceTotal, libraryPrice);
  });

  test('invoiceTotal equals sum of row prices for multiple fill events', async () => {
    // Two separate fill events — this is the critical invariant.
    // If CEIL is applied correctly per-event, total === sum(rows).
    const price1 = calcTotalFillCostCents(
      [calcGasFillCostCents(calculateVolumeLitres(SC_OXYGEN_VOLUME, 10, 8), O2_PRICE_DEFAULT)],
      [],
    ); // 60 cents
    const price2 = calcTotalFillCostCents(
      [],
      [calcDiluentFillCostCents(calculateVolumeLitres(SC_DILUENT_VOLUME, 10, 8), 40, HE_PRICE)],
    ); // 240 cents

    const id1 = await postFill({
      cylinderSetId: CYLINDER_SET_ID,
      gasMixture: 'EAN32',
      filledAir: false,
      storageCylinderUsageArr: [
        { storageCylinderId: 5, startPressure: 10, endPressure: 8 },
      ],
      price: price1,
    });
    const id2 = await postFill({
      cylinderSetId: CYLINDER_SET_ID,
      gasMixture: 'TMX 20/40',
      filledAir: false,
      storageCylinderUsageArr: [],
      diluentCylinderUsageArr: [
        { storageCylinderId: 11, startPressure: 10, endPressure: 8, oxygenPercentage: 20, heliumPercentage: 40 },
      ],
      price: price2,
    });

    const invoice = await getInvoice();
    const rowById = Object.fromEntries(invoice.invoiceRows.map((r) => [r.id, r.price]));

    assert.strictEqual(rowById[id1], price1, 'row 1 price should be 60 cents');
    assert.strictEqual(rowById[id2], price2, 'row 2 price should be 240 cents');

    const sumOfRows = invoice.invoiceRows.reduce((s, r) => s + r.price, 0);
    assert.strictEqual(invoice.invoiceTotal, sumOfRows, 'total must equal sum of row prices');
    assert.strictEqual(invoice.invoiceTotal, price1 + price2);
  });

  test('invoiceTotal equals sum of row prices with fractional-cent gas prices', async () => {
    // MariaDB stores gas prices as FLOAT(6,2). At 0.9 c/L, SQL float arithmetic gives
    // 100 × 0.60000002... = 60.000002..., so CEIL returns 61 instead of 60 unless the
    // price is cast to DECIMAL first. This test verifies the CAST is in place.
    await getTestKnex()('gas_price')
      .where('id', O2_GAS_PRICE_ID)
      .update({ price_eur_cents: O2_PRICE_FRACTIONAL });

    // Event 1: 196→183 bar, 50L → 650L × 0.9 = 585 cents
    const price1 = calcTotalFillCostCents(
      [calcGasFillCostCents(calculateVolumeLitres(SC_OXYGEN_VOLUME, 196, 183), O2_PRICE_FRACTIONAL)],
      [],
    );
    assert.strictEqual(price1, 585);

    // Event 2: 34→28 bar, 50L → 300L × 0.9 = 270 cents
    const price2 = calcTotalFillCostCents(
      [calcGasFillCostCents(calculateVolumeLitres(SC_OXYGEN_VOLUME, 34, 28), O2_PRICE_FRACTIONAL)],
      [],
    );
    assert.strictEqual(price2, 270);

    const id1 = await postFill({
      cylinderSetId: CYLINDER_SET_ID,
      gasMixture: 'EAN32',
      filledAir: false,
      storageCylinderUsageArr: [
        { storageCylinderId: 5, startPressure: 196, endPressure: 183 },
      ],
      price: price1,
    });
    const id2 = await postFill({
      cylinderSetId: CYLINDER_SET_ID,
      gasMixture: 'EAN32',
      filledAir: false,
      storageCylinderUsageArr: [
        { storageCylinderId: 5, startPressure: 34, endPressure: 28 },
      ],
      price: price2,
    });

    const invoice = await getInvoice();
    const rowById = Object.fromEntries(invoice.invoiceRows.map((r) => [r.id, r.price]));

    assert.strictEqual(rowById[id1], price1, 'row 1 price should be 585');
    assert.strictEqual(rowById[id2], price2, 'row 2 price should be 270');

    const sumOfRows = invoice.invoiceRows.reduce((s, r) => s + r.price, 0);
    assert.strictEqual(
      invoice.invoiceTotal,
      sumOfRows,
      'invoiceTotal must equal the sum of row prices (regression: was off by 1 cent)',
    );
    assert.strictEqual(invoice.invoiceTotal, 855);
  });
});
