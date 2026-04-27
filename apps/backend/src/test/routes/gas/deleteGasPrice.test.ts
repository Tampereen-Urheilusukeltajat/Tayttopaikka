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

// IDs match test data: gas_price.csv
// id=1: Air, active 2000-01-01 → 2099-06-01 (current, capped)
// id=2: Air, active 2099-06-01 → 9999 (future, to be deleted)
// id=3: Helium, active 2000-01-01 → 9999 (current, untouched)
const FUTURE_PRICE_ID = '2';
const CURRENT_PRICE_ID = '1';
const HELIUM_PRICE_ID = '3';

describe('Delete gas price', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({ knex: getTestKnex(), routePrefix: 'api' });

  before(async () => {
    await createTestDatabase('delete_gas_price');
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
      payload: { email: 'test-admin@email.fi', password: 'password' },
    });
    headers = { Authorization: 'Bearer ' + String(JSON.parse(res.body).accessToken) };
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Happy path', () => {
    test('responds 204 and removes the future price', async () => {
      const res = await server.inject({
        headers,
        method: 'DELETE',
        url: `api/gas/price/${FUTURE_PRICE_ID}`,
      });

      assert.strictEqual(res.statusCode, 204);

      const rows = await getTestKnex()('gas_price').where('id', FUTURE_PRICE_ID);
      assert.strictEqual(rows.length, 0);
    });

    test('restores active_to of the previous price to 9999 after deletion', async () => {
      await server.inject({
        headers,
        method: 'DELETE',
        url: `api/gas/price/${FUTURE_PRICE_ID}`,
      });

      const [restoredPrice] = await getTestKnex()('gas_price').where('id', CURRENT_PRICE_ID);
      assert.strictEqual(
        restoredPrice.active_to.toISOString().startsWith('9999'),
        true,
      );
    });

    test('leaves unrelated gas prices untouched', async () => {
      await server.inject({
        headers,
        method: 'DELETE',
        url: `api/gas/price/${FUTURE_PRICE_ID}`,
      });

      const [heliumPrice] = await getTestKnex()('gas_price').where('id', HELIUM_PRICE_ID);
      assert.ok(heliumPrice);
      assert.strictEqual(heliumPrice.gas_id, 2);
    });
  });

  describe('Unhappy path', () => {
    test('responds 401 without auth header', async () => {
      const res = await server.inject({
        method: 'DELETE',
        url: `api/gas/price/${FUTURE_PRICE_ID}`,
      });

      assert.strictEqual(res.statusCode, 401);
    });

    test('responds 403 for non-admin', async () => {
      const loginRes = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: { email: 'test@email.fi', password: 'password' },
      });
      const nonAdminHeaders = {
        Authorization: 'Bearer ' + String(JSON.parse(loginRes.body).accessToken),
      };

      const res = await server.inject({
        headers: nonAdminHeaders,
        method: 'DELETE',
        url: `api/gas/price/${FUTURE_PRICE_ID}`,
      });

      assert.strictEqual(res.statusCode, 403);
    });

    test('responds 404 for non-existent price', async () => {
      const res = await server.inject({
        headers,
        method: 'DELETE',
        url: `api/gas/price/99999`,
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('responds 400 when trying to delete a currently active price', async () => {
      const res = await server.inject({
        headers,
        method: 'DELETE',
        url: `api/gas/price/${CURRENT_PRICE_ID}`,
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(
        JSON.parse(res.body).message,
        'Cannot delete a price that is already active',
      );
    });
  });
});
