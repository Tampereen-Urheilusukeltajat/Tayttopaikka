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
import { knexController } from '../../../database/database';
import { buildServer } from '../../../server';
import {
  createTestDatabase,
  dropTestDatabase,
  startRedisConnection,
  stopRedisConnection,
} from '../../../lib/utils/testUtils';

describe('Get user', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('get_user');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await knexController.destroy();
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
  describe('User is found', () => {
    test('it returns 200 and has right properties', async (t) => {
      const res = await server.inject({
        url: '/api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        method: 'GET',
        headers,
      });
      const resBody = JSON.parse(res.body);
      assert.strictEqual(res.statusCode, 200);
      await t.assert.snapshot(resBody);
    });
  });
  describe('User cant be returned', () => {
    test('it returns 404 if user is not found', async () => {
      const res = await server.inject({
        url: '/api/user/1be5abcd-53d4-11ed-9342-0242ac120069/',
        method: 'GET',
        headers,
      });
      assert.strictEqual(res.statusCode, 404);
      const resBody = JSON.parse(res.body);
      assert.ok('error' in resBody);
      assert.ok('message' in resBody);
    });

    test('it returns 404 if user is archived', async () => {
      const res = await server.inject({
        url: '/api/user/fbdfc65b-52ce-11ed-85ed-0242ac120002/',
        method: 'GET',
        headers,
      });
      assert.strictEqual(res.statusCode, 404);
      const resBody = JSON.parse(res.body);
      assert.ok('error' in resBody);
      assert.ok('message' in resBody);
    });

    test('it returns 404 if user is deleted', async () => {
      const res = await server.inject({
        url: '/api/user/db2e9bfa-53db-11ed-9342-0242ac120002',
        method: 'GET',
        headers,
      });
      assert.strictEqual(res.statusCode, 404);
      const resBody = JSON.parse(res.body);
      assert.ok('error' in resBody);
      assert.ok('message' in resBody);
    });
  });
});
