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
import { buildServer } from '../../../server';
import {
  createTestDatabase,
  dropTestDatabase,
  startRedisConnection,
  stopRedisConnection,
  getTestKnex,
} from '../../../lib/utils/testUtils';

describe('Refresh', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('auth');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let refreshToken: string;
  let server;
  beforeEach(async () => {
    server = await getTestInstance();
    const res = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'user@example.com',
        password: 'password',
      },
    });
    assert.strictEqual(res.statusCode, 200);
    const tokens = JSON.parse(res.body);
    refreshToken = String(tokens.refreshToken);
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Happy path', () => {
    test('It returns 200 on successful refresh token rotate', async () => {
      const res = await server.inject({
        url: '/api/refresh',
        method: 'POST',
        payload: {
          refreshToken,
        },
      });
      assert.strictEqual(res.statusCode, 200);
      const resBody = JSON.parse(res.body);
      assert.ok('accessToken' in resBody);
      assert.ok('refreshToken' in resBody);
      assert.notStrictEqual(resBody.refreshToken, refreshToken);
    });
  });
  describe('Unhappy path', () => {
    test('It returns 401 for invalid refreshToken (tampered)', async () => {
      const res = await server.inject({
        url: '/api/refresh',
        method: 'POST',
        payload: {
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhIjpudWxsfQ.d3KrYIOoi5LIdMEbSpeMj7Hrw26hhBk0s9_FUwNTcoE',
        },
      });

      assert.strictEqual(res.statusCode, 401);
      const resBody = JSON.parse(res.body);
      assert.ok(!('accessToken' in resBody));
      assert.ok(!('refreshToken' in resBody));
    });

    test('It returns 400 for invalid body', async () => {
      const res = await server.inject({
        url: '/api/refresh',
        method: 'POST',
        payload: {},
      });
      assert.strictEqual(res.statusCode, 400);
      const resBody = JSON.parse(res.body);
      assert.ok(!('accessToken' in resBody));
      assert.ok(!('refreshToken' in resBody));
    });

    test('It returns 401 if refreshToken is used as accesstoken', async () => {
      const res = await server.inject({
        url: '/api/user/1be5abcd-53d4-11ed-9342-0242ac120002',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + String(refreshToken),
        },
      });
      assert.strictEqual(res.statusCode, 401);
      const resBody = JSON.parse(res.body);
      assert.ok(!('id' in resBody));
      assert.ok(!('email' in resBody));
    });
  });
});
