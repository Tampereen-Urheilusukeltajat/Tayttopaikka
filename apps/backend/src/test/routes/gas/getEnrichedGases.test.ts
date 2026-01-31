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
} from '../../../lib/utils/testUtils';
import { knexController } from '../../../database/database';
import { buildServer } from '../../../server';

describe('Get enriched gases', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('get_enriched_gas');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await knexController.destroy();
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
        email: 'test@email.fi',
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
    test('responds with enriched gases and 200 status', async () => {
      const res = await server.inject({
        headers,
        method: 'GET',
        url: 'api/gas',
      });

      assert.deepStrictEqual(res.statusCode, 200);
      const body = JSON.parse(res.body);

      assert.deepStrictEqual(body.length, 5);
      assert.ok('activeFrom' in body[0]);

      delete body[0].activeFrom;

      assert.strictEqual(body[0].gasId, '1');
      assert.strictEqual(body[0].gasName, 'Air');
      assert.strictEqual(body[0].priceEurCents, 0);
    });
  });

  describe('Unhappy path', () => {
    test('responds 401 if authentication header was not provided', async () => {
      const res = await server.inject({
        method: 'GET',
        url: 'api/gas',
      });

      assert.deepStrictEqual(res.statusCode, 401);
    });
  });
});
