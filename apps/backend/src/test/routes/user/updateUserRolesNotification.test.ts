import 'dotenv/config';
import {
  describe,
  test,
  before,
  after,
  beforeEach,
  afterEach,
  mock,
} from 'node:test';
import assert from 'node:assert';
import { type FastifyInstance } from 'fastify';
import { type EmailMessage } from '../../../types/email.types';

describe('isUser change notification email', () => {
  let sentMessages: EmailMessage[] = [];
  let shouldThrowOnSend = false;

  let createTestDatabase: (
    testDataFolder?: string,
  ) => Promise<void>;
  let dropTestDatabase: () => Promise<void>;
  let startRedisConnection: () => Promise<void>;
  let stopRedisConnection: () => Promise<void>;
  let getTestKnex: () => import('knex').Knex;
  let buildServer: (opts: {
    knex: import('knex').Knex;
    routePrefix: string;
  }) => Promise<FastifyInstance>;

  before(async () => {
    mock.module('../../../lib/utils/sendEmail', {
      namedExports: {
        sendEmail: async (msg: EmailMessage) => {
          if (shouldThrowOnSend) throw new Error('boom');
          sentMessages.push(msg);
        },
      },
    });

    ({
      createTestDatabase,
      dropTestDatabase,
      startRedisConnection,
      stopRedisConnection,
      getTestKnex,
    } = await import('../../../lib/utils/testUtils.js'));
    ({ buildServer } = await import('../../../server.js'));

    await createTestDatabase('update_user_roles');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  let server: FastifyInstance;
  let headers: { Authorization: string };
  beforeEach(async () => {
    sentMessages = [];
    shouldThrowOnSend = false;
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

  test('granting isUser sends an activation email', async () => {
    const userId = '56e3e8b0-53d4-11ed-9342-0242ac120002';

    // Start from isUser: false so the grant below is an actual change
    await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isUser: false },
    });
    sentMessages = [];

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isUser: true },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0].to, 'basic-user@test.com');
    assert.match(sentMessages[0].text, /aktivoi/i);
  });

  test('revoking isUser sends a deactivation email', async () => {
    const userId = '56e3e8b0-53d4-11ed-9342-0242ac120002';

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isUser: false },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0].to, 'basic-user@test.com');
    assert.match(sentMessages[0].text, /poistanut/i);

    // Restore state for subsequent tests
    await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isUser: true },
    });
  });

  test('changing a different role while isUser stays the same sends no email', async () => {
    const userId = '54e3e8b0-53d4-11ed-9342-0242ac120002';

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isBlender: false },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(sentMessages.length, 0);

    // Restore state for subsequent tests
    await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isBlender: true },
    });
  });

  test('resubmitting the current isUser value sends no email', async () => {
    const userId = '54e3e8b0-53d4-11ed-9342-0242ac120002';

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isUser: true },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(sentMessages.length, 0);
  });

  test('still responds 200 with the updated user when sendEmail fails', async () => {
    const userId = '54e3e8b0-53d4-11ed-9342-0242ac120002';
    shouldThrowOnSend = true;

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isUser: false },
    });

    assert.strictEqual(res.statusCode, 200);
    const updatedUser = JSON.parse(res.body);
    assert.strictEqual(updatedUser.isUser, false);

    // Restore state for subsequent tests
    shouldThrowOnSend = false;
    await server.inject({
      method: 'PATCH',
      url: `/api/user/${userId}/roles`,
      headers,
      payload: { isUser: true },
    });
  });
});
