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

describe('Get invoices', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('update_user_roles');
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
    test('is able to remove blender role', async () => {
      const userId = '54e3e8b0-53d4-11ed-9342-0242ac120002';
      const res = await server.inject({
        method: 'PATCH',
        url: `/api/user/${userId}/roles`,
        headers,
        payload: {
          isBlender: false,
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const updatedUser = JSON.parse(res.body);
      assert.strictEqual(updatedUser.isBlender, false);

      const res2 = await server.inject({
        method: 'PATCH',
        url: `/api/user/${userId}/roles`,
        headers,
        payload: {
          isBlender: true,
        },
      });

      assert.strictEqual(res2.statusCode, 200);
      const updatedUser2 = JSON.parse(res2.body);
      assert.strictEqual(updatedUser2.isBlender, true);
    });

    test('is able to add admin role', async () => {
      const userId = '56e3e8b0-53d4-11ed-9342-0242ac120002';
      const res = await server.inject({
        method: 'PATCH',
        url: `/api/user/${userId}/roles`,
        headers,
        payload: {
          isAdmin: true,
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const updatedUser = JSON.parse(res.body);
      assert.strictEqual(updatedUser.isAdmin, true);
    });
  });

  describe('Unhappy path', () => {
    test('responds 401 if authentication header was not provided', async () => {
      const res = await server.inject({
        method: 'GET',
        url: 'api/invoicing',
      });

      assert.strictEqual(res.statusCode, 401);
    });

    test('responds with 403 if the user is not an admin', async () => {
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

      assert.strictEqual(res.statusCode, 403);
    });

    test('responds with 404 if user does not exist', async () => {
      const userId = '56e3e8b0-53d4-11ed-9349-0242ac120009';
      const res = await server.inject({
        method: 'PATCH',
        url: `/api/user/${userId}/roles`,
        headers,
        payload: {
          isAdmin: true,
        },
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('responds with 400 if roles payload is invalid', async () => {
      const userId = '56e3e8b0-53d4-11ed-9342-0242ac120002';
      const res = await server.inject({
        method: 'PATCH',
        url: `/api/user/${userId}/roles`,
        headers,
        payload: {
          isSuperAdmin: true,
        },
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });
});
