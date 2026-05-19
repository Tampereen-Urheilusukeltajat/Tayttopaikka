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

/**
 * End-to-end flow: fills → invoice → pay → fills again → invoice only new fills.
 *
 * Gas prices (invoice_e2e seed):
 *   Helium  (gas_price id=12): 6 c/L = 0.06 €/L
 *   Oxygen  (gas_price id=13): 0.6 c/L = 0.006 €/L
 *
 * Storage cylinders:
 *   id=5:  Oxygen,  50L
 *   id=11: Diluent, 50L
 *
 * Users:
 *   test@email.fi  — blender, owns cylinder sets, does the fills
 *   admin@XD.fi    — admin+blender, runs invoicing
 */
describe('Invoice e2e flow', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

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
    await getTestKnex()('fill_event_diluent_fill').del();
    await getTestKnex()('fill_event_gas_fill').del();
    await getTestKnex()('invoice').del();
    await getTestKnex()('fill_event_payment_event').del();
    await getTestKnex()('payment_event').del();
    await getTestKnex()('fill_event_cylinder_set').del();
    await getTestKnex()('fill_event').del();
    await server.close();
  });

  // Helper: create a regular O2 gas fill
  // sc5 = Oxygen 50L, start=10, end=8 → ceil(2)*50 = 100L × 0.6 c/L = 60 cents
  const createGasFill = async (
    srv: FastifyInstance,
    headers: { Authorization: string },
  ): Promise<number> => {
    const res = await srv.inject({
      url: 'api/fill-event',
      method: 'POST',
      body: {
        cylinderSetIds: ['a4e1035e-f36e-4056-9a1b-5925a3c5793e'],
        gasMixture: 'EAN32',
        filledAir: false,
        storageCylinderUsageArr: [
          { storageCylinderId: 5, startPressure: 10, endPressure: 8 },
        ],
        price: 60,
      },
      headers,
    });
    assert.strictEqual(res.statusCode, 201, `gas fill failed: ${res.body}`);
    return JSON.parse(res.body).id as number;
  };

  // Helper: create a diluent fill
  // sc11 = Diluent 50L, 20% O2 + 40% He, start=10, end=8 → 100L
  // price = ceil(0.40*6 * 100) = ceil(240) = 240 cents (O2 not charged)
  const createDiluentFill = async (
    srv: FastifyInstance,
    headers: { Authorization: string },
  ): Promise<number> => {
    const res = await srv.inject({
      url: 'api/fill-event',
      method: 'POST',
      body: {
        cylinderSetIds: ['a4e1035e-f36e-4056-9a1b-5925a3c5793e'],
        gasMixture: 'TMX 20/40',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: 11,
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 20,
            heliumPercentage: 40,
          },
        ],
        price: 240,
      },
      headers,
    });
    assert.strictEqual(res.statusCode, 201, `diluent fill failed: ${res.body}`);
    return JSON.parse(res.body).id as number;
  };

  test('invoice includes both gas and diluent fills, then only new fills after payment', async () => {
    // --- Step 1: two fills before first invoice ---
    const gasFillId = await createGasFill(server, blenderHeaders);
    const diluentFillId = await createDiluentFill(server, blenderHeaders);

    // --- Step 2: fetch invoice, verify both fills included ---
    const invoiceRes1 = await server.inject({
      headers: adminHeaders,
      method: 'GET',
      url: 'api/invoicing',
    });
    assert.strictEqual(invoiceRes1.statusCode, 200);

    const invoices1 = JSON.parse(invoiceRes1.body) as Invoice[];
    assert.strictEqual(invoices1.length, 1, 'one user should have unpaid fills');

    const invoice1 = invoices1[0];
    const ids1 = invoice1.invoiceRows.map((r) => r.id);
    assert.ok(ids1.includes(gasFillId), 'gas fill should appear in invoice');
    assert.ok(ids1.includes(diluentFillId), 'diluent fill should appear in invoice');
    // 60 (gas O2) + 240 (diluent) = 300
    assert.strictEqual(invoice1.invoiceTotal, 300);

    // --- Step 3: pay the invoice ---
    const payRes = await server.inject({
      headers: adminHeaders,
      method: 'POST',
      url: 'api/invoicing/payment-events',
      payload: invoices1,
    });
    assert.strictEqual(payRes.statusCode, 201);

    // --- Step 4: invoice is now empty ---
    const invoiceRes2 = await server.inject({
      headers: adminHeaders,
      method: 'GET',
      url: 'api/invoicing',
    });
    assert.strictEqual(invoiceRes2.statusCode, 200);
    const invoices2 = JSON.parse(invoiceRes2.body) as Invoice[];
    assert.strictEqual(invoices2.length, 0, 'all fills should be paid');

    // --- Step 5: new gas fill after payment ---
    const newGasFillId = await createGasFill(server, blenderHeaders);

    // --- Step 6: invoice only shows the new fill ---
    const invoiceRes3 = await server.inject({
      headers: adminHeaders,
      method: 'GET',
      url: 'api/invoicing',
    });
    assert.strictEqual(invoiceRes3.statusCode, 200);
    const invoices3 = JSON.parse(invoiceRes3.body) as Invoice[];
    assert.strictEqual(invoices3.length, 1, 'one user should have unpaid fills again');

    const invoice3 = invoices3[0];
    const ids3 = invoice3.invoiceRows.map((r) => r.id);
    assert.ok(ids3.includes(newGasFillId), 'new fill should appear');
    assert.ok(!ids3.includes(gasFillId), 'old paid fill should not appear');
    assert.ok(!ids3.includes(diluentFillId), 'old paid diluent fill should not appear');
    assert.strictEqual(invoice3.invoiceTotal, 60);
  });

  test('diluent-only fill event appears in invoice', async () => {
    const diluentFillId = await createDiluentFill(server, blenderHeaders);

    const invoiceRes = await server.inject({
      headers: adminHeaders,
      method: 'GET',
      url: 'api/invoicing',
    });
    assert.strictEqual(invoiceRes.statusCode, 200);

    const invoices = JSON.parse(invoiceRes.body) as Invoice[];
    assert.strictEqual(invoices.length, 1);
    assert.strictEqual(invoices[0].invoiceTotal, 240);
    assert.ok(invoices[0].invoiceRows.map((r) => r.id).includes(diluentFillId));
  });
});
