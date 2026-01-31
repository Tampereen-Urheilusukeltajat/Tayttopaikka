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

describe('Set new password', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('password_reset');
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

  test('It returns 204 for existing user', async () => {
    const res = await server.inject({
      url: '/api/reset-password/set-password',
      method: 'POST',
      payload: {
        token: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        userId: '1be5abcd-53d4-11ed-9342-0242ac120002',
        password: 'rockYou.txt',
      },
    });

    assert.strictEqual(res.statusCode, 204);
  });

  test('It returns 204 for nonexistent user', async () => {
    const res = await server.inject({
      url: '/api/reset-password/set-password',
      method: 'POST',
      payload: {
        token: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        userId: '1be5abcd-53d4-11ed-9342-0242ac120009',
        password: 'rockYou.txt',
      },
    });

    assert.strictEqual(res.statusCode, 204);
  });
});
