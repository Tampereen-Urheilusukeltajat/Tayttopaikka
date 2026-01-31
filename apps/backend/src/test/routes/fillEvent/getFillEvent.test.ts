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

describe('get fill events of the user', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('get_fill_event');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server;
  let headers: object;
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

  describe('successful', () => {
    test('Get fill events', async () => {
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'GET',
        headers,
      });

      const resBody = JSON.parse(res.body);
      assert.deepStrictEqual(res.statusCode, 200);
      assert.strictEqual(Array.isArray(resBody), true);
      assert.strictEqual(resBody.length, 1);
      assert.strictEqual(
        resBody[0].cylinderSetId,
        'f4e1035e-f36e-4056-9a1b-5925a3c5793e',
      );
      assert.strictEqual(resBody[0].gasMixture, 'EAN21');
      assert.strictEqual(resBody[0].price, 0);
    });
  });

  describe('unsuccessful', () => {
    test('responds 401 if authentication header was not provided', async () => {
      const res = await server.inject({
        method: 'GET',
        url: 'api/fill-event',
      });

      assert.deepStrictEqual(res.statusCode, 401);
    });
  });
});
