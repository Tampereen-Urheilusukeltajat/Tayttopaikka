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

describe('Delete user', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('delete_user');
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

  /**
   * @TODO Change tests so that they are independent from each other and can
   * be run alone
   */
  describe('successful', () => {
    const delUserId = '54e3e8b0-53d4-11ed-9342-0242ac120002';

    test('it returns 200 when successful', async () => {
      const login = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'admin@admin.com',
          password: 'salasana',
        },
      });
      const tokens = JSON.parse(login.body);
      const headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

      const res = await server.inject({
        url: `api/user/${delUserId}`,
        method: 'DELETE',
        headers,
      });
      const resBody = JSON.parse(res.body);
      assert.strictEqual(res.statusCode, 200);
      assert.match(resBody.userId, new RegExp(delUserId));
      assert.notStrictEqual(resBody.deletedAt, null);
    });

    test('it anonymizes user data', async () => {
      const res = await getTestKnex()('user')
        .where({ id: delUserId })
        .first(
          'email',
          'forename',
          'surname',
          'phone_number',
          'deleted_at as deletedAt',
        );
      assert.strictEqual(res.email, null);
      assert.strictEqual(res.forename, null);
      assert.strictEqual(res.surname, null);
      assert.strictEqual(res.phone_number, null);
      assert.notStrictEqual(res.deletedAt, null);
    });

    test('it archives cylinder sets', async (t) => {
      const res = await getTestKnex()('diving_cylinder_set')
        .where({ owner: delUserId })
        .select('id', 'archived');
      await t.assert.snapshot(res);
    });
  });

  describe('not successful', () => {
    test('it returns 404 when user is not found', async () => {
      const login = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'admin@admin.com',
          password: 'salasana',
        },
      });
      const tokens = JSON.parse(login.body);
      const headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120069',
        method: 'DELETE',
        headers,
      });
      assert.strictEqual(res.statusCode, 404);
    });

    test('it returns 403 when user is not an admin', async () => {
      const login = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'user@taursu.fi',
          password: 'salasana',
        },
      });
      const tokens = JSON.parse(login.body);
      const headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

      const res = await server.inject({
        url: 'api/user/a58fff36-4f75-11ed-96af-77941df8882',
        method: 'DELETE',
        headers,
      });
      assert.strictEqual(res.statusCode, 403);
    });
  });
});
