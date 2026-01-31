import { describe, test, before, after } from 'node:test';
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

describe('get cylinder sets', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('get_diving_cylinder_sets');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await knexController.destroy();
    await stopRedisConnection();
  });

  let server;
  let headers: object;
  test('returns users diving cylinder sets', async (t) => {
    server = await getTestInstance();
    const authRes = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'user@taursu.fi',
        password: 'salasana',
      },
    });
    const tokens = JSON.parse(authRes.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

    const res = await server.inject({
      url: `api/cylinder-set/?userId=a59faf66-4f75-11ed-98ae-77941df77788`,
      method: 'GET',
      headers,
    });

    assert.strictEqual(res.statusCode, 200);

    const body = JSON.parse(res.body);
    assert.strictEqual(body.length, 3);
    await t.assert.snapshot(body);
  });

  test('does not allow reading other users diving cylinders', async () => {
    server = await getTestInstance();
    const authRes = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'user@taursu.fi',
        password: 'salasana',
      },
    });
    const tokens = JSON.parse(authRes.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

    const res = await server.inject({
      url: `api/cylinder-set/?userId=a59faf66-4f75-11ed-98ae-77941df77789`,
      method: 'GET',
      headers,
    });

    assert.strictEqual(res.statusCode, 403);
  });

  test('admin is able to read other users diving cylinders', async () => {
    server = await getTestInstance();
    const authRes = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'admin@taursu.fi',
        password: 'salasana',
      },
    });
    const tokens = JSON.parse(authRes.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

    const dcsResponse = await server.inject({
      url: `api/cylinder-set/?userId=a59faf66-4f75-11ed-98ae-77941df77788`,
      method: 'GET',
      headers,
    });

    assert.strictEqual(dcsResponse.statusCode, 200);

    const body = JSON.parse(dcsResponse.body);
    assert.strictEqual(body.length, 3);
  });

  test('returns empty array if user does not have cylinder sets', async () => {
    server = await getTestInstance();
    const authRes = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'admin@taursu.fi',
        password: 'salasana',
      },
    });
    const tokens = JSON.parse(authRes.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

    const dcsResponse = await server.inject({
      url: `api/cylinder-set/?userId=a59faf66-4f75-11ed-98ae-77941df77790`,
      method: 'GET',
      headers,
    });

    assert.strictEqual(dcsResponse.statusCode, 200);

    const body = JSON.parse(dcsResponse.body);
    assert.deepStrictEqual(body, []);
  });

  test('returns empty array if user is not found', async () => {
    server = await getTestInstance();
    const authRes = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'admin@taursu.fi',
        password: 'salasana',
      },
    });
    const tokens = JSON.parse(authRes.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

    const dcsResponse = await server.inject({
      url: `api/cylinder-set/?userId=a59faf66-4f75-11ed-98ae-77941df77799`,
      method: 'GET',
      headers,
    });

    assert.strictEqual(dcsResponse.statusCode, 200);

    const body = JSON.parse(dcsResponse.body);
    assert.deepStrictEqual(body, []);
  });
});
