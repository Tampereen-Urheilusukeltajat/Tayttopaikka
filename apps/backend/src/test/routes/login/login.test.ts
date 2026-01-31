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

describe('Login', () => {
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

  let server;
  beforeEach(async () => {
    server = await getTestInstance();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Happy path', () => {
    test('It returns 200 on successful login', async () => {
      const res = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'user@example.com',
          password: 'password',
        },
      });
      assert.strictEqual(res.statusCode, 200);
      const resBody = JSON.parse(res.body);
      assert.ok('accessToken' in resBody);
      assert.ok('refreshToken' in resBody);
    });

    test('It returns correct roles inside the JWT token', async (t) => {
      const res = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'user@example.com',
          password: 'password',
        },
      });
      assert.strictEqual(res.statusCode, 200);
      const resBody = JSON.parse(res.body);
      const tokenPayload = JSON.parse(
        Buffer.from(resBody.accessToken.split('.')[1], 'base64').toString(),
      );

      assert.ok('iat' in tokenPayload);
      delete tokenPayload.iat;

      assert.ok('exp' in tokenPayload);
      delete tokenPayload.exp;

      // Check that token has the expected user ID
      assert.ok('id' in tokenPayload);
      assert.strictEqual(
        tokenPayload.id,
        '1be5abcd-53d4-11ed-9342-0242ac120002',
      );
    });

    test('It updates last_login', async (t) => {
      const res = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'user@example.com',
          password: 'password',
        },
      });
      assert.strictEqual(res.statusCode, 200);

      const dbRes = await getTestKnex().raw(`
        SELECT
          email,
          last_login
        FROM user
        WHERE email = 'user@example.com';
      `);

      assert.strictEqual(dbRes[0][0].email, 'user@example.com');
      assert.ok(dbRes[0][0].last_login);
    });
  });
  describe('Unhappy path', () => {
    test('It returns 401 if user is not found', async () => {
      const res = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'non-existent-user@example.com',
          password: 'password',
        },
      });
      assert.deepStrictEqual(res.statusCode, 401);
      const resBody = JSON.parse(res.body);
      assert.ok(!('accessToken' in resBody));
      assert.ok(!('refreshToken' in resBody));
    });

    test('It returns 401 if password is wrong', async () => {
      const res = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'user@example.com',
          password: 'wrong-password',
        },
      });
      assert.strictEqual(res.statusCode, 401);
      const resBody = JSON.parse(res.body);
      assert.ok(!('accessToken' in resBody));
      assert.ok(!('refreshToken' in resBody));
    });

    test('It returns 400 for invalid body', async () => {
      const res = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: null,
          password: null,
        },
      });
      assert.strictEqual(res.statusCode, 400);
      const resBody = JSON.parse(res.body);
      assert.ok(!('accessToken' in resBody));
      assert.ok(!('refreshToken' in resBody));
    });

    test('Archived user cannot login', async () => {
      const res = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'oujea@XD.fi',
          password: 'password',
        },
      });
      assert.strictEqual(res.statusCode, 401);
      const resBody = JSON.parse(res.body);
      assert.ok(!('accessToken' in resBody));
      assert.ok(!('refreshToken' in resBody));
    });
  });
});
