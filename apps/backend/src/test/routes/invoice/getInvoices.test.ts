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

describe('Get invoices', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('get_invoices');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server: FastifyInstance;
  let headers: { Authorization: string };
  beforeEach(async () => {
    server = await getTestInstance();
    const res = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'admin@test.com',
        password: 'password',
      },
    });
    const tokens = JSON.parse(res.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Happy path', () => {
    test('responds with the invoices and with the 200 status', async () => {
      const res = await server.inject({
        headers,
        method: 'GET',
        url: 'api/invoicing',
      });

      assert.deepStrictEqual(res.statusCode, 200);
      const body = JSON.parse(res.body) as Invoice[];

      const fillEventIds = body.flatMap((invoice) =>
        invoice.invoiceRows.map((ir) => ir.id),
      );

      // Fill event with the id 2 shouldn't be returned since it's air fill
      assert.ok(!fillEventIds.includes(2));

      // Fill event with the id 6 shouldn't be returned since the price is 0
      assert.ok(!fillEventIds.includes(6));

      // Check that we have invoices with rows
      assert.ok(body.length > 0);
      assert.ok(body[0].invoiceRows.length > 0);

      // Verify diluent fill costs are included in invoice totals.
      // admin user: fe3 (He 500L×300 + O2 300×150) + fe4 (O2old 5000×100) + fe7 (diluent-only)
      // fe3 gas = 150000+45000=195000
      // fe4 = 500000, fe7 = 15000
      // admin invoiceTotal = 195000 + 500000 + 15000 = 710000
      const adminInvoice = body.find((i) => i.user.email === 'admin@test.com');
      assert.ok(adminInvoice, 'admin invoice should exist');
      assert.strictEqual(adminInvoice.invoiceTotal, 710000);

      // user: fe5 (O2old 5000×100) = 500000, no diluent
      const userInvoice = body.find((i) => i.user.email === 'user@test.com');
      assert.ok(userInvoice, 'user invoice should exist');
      assert.strictEqual(userInvoice.invoiceTotal, 500000);
    });
  });

  describe('Unhappy path', () => {
    test('responds 401 if authentication header was not provided', async () => {
      const res = await server.inject({
        method: 'GET',
        url: 'api/invoicing',
      });

      assert.deepStrictEqual(res.statusCode, 401);
    });

    test('Responds with 403 if the user is not an admin', async () => {
      const loginRes = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'user@test.com',
          password: 'password',
        },
      });
      const tokens = JSON.parse(loginRes.body);
      headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

      const res = await server.inject({
        headers,
        method: 'GET',
        url: 'api/invoicing',
      });

      assert.deepStrictEqual(res.statusCode, 403);
    });
  });
});
