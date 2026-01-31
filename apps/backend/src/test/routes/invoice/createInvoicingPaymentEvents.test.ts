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
import { type PaymentEvent } from '../../../types/payment.types';

describe('Create invoicing payment events', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('create_invoicing_payment_events');
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
      const invoiceRes = await server.inject({
        headers,
        method: 'GET',
        url: 'api/invoicing',
      });
      assert.deepStrictEqual(invoiceRes.statusCode, 200);

      const paymentEventsRes = await server.inject({
        headers,
        method: 'POST',
        url: 'api/invoicing/payment-events',
        payload: JSON.parse(invoiceRes.body),
      });

      assert.deepStrictEqual(paymentEventsRes.statusCode, 201);

      const body = JSON.parse(paymentEventsRes.body) as PaymentEvent[];

      assert.strictEqual(body.length, 2);
      body.forEach((pe) => {
        assert.ok(pe.id);
        assert.ok(pe.createdAt);
        assert.ok(pe.updatedAt);
        assert.ok(pe.status === 'COMPLETED');
        assert.ok(pe.totalAmountEurCents > 0);
      });

      // Check database state
      const invoiceRows = await getTestKnex()('invoice').select([
        'payment_event_id',
        'created_by',
      ]);

      invoiceRows.forEach((row) => {
        assert.deepStrictEqual(row.created_by, body[0].userId);
        assert.ok(
          body.map((pe) => pe.id).includes(row.payment_event_id as string),
        );
      });
    });
  });

  describe('Unhappy path', () => {
    test('responds 401 if authentication header was not provided', async () => {
      const res = await server.inject({
        method: 'POST',
        url: 'api/invoicing/payment-events',
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
        method: 'POST',
        url: 'api/invoicing/payment-events',
      });

      assert.deepStrictEqual(res.statusCode, 403);
    });
  });
});
