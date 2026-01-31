import { describe, test, before, after, mock } from 'node:test';
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

const USER_PAYLOAD = {
  email: 'erkki@sukeltaja.fi',
  phoneNumber: '00010',
  forename: 'Erkki',
  surname: 'Nitikka',
  password: 'superhyväsalasana',
  turnstileToken:
    '0H9sCE19DLgiaIBqjC6qTzYQb89Gk06cp60oX6j7K8YCr7mGCo0ddgZOj4J6G225BCjr2CZxfHeC082VUrdJ4fhfdMwfL3aLerRcdmQDuH8ypXeincJa5xWFjdHacljsXbZBUZGMcynpEcPmhtUsNYx7JMXLoyrSV0bYwnAfEUrhqC9NHbaLchQYbQXDrhGmD09ujj0tMARCnEZ0lOmgtHez6WYE9JG1QkJYnRj9CxrPqXItNxkv5uUl7Qel64pvZIW6KhaHjma13IaV5C3sZ5tBHRJRXVOSIpg0Sir1VAE9yNQsF0SJMwB9unOlC6t3Jt1oHy1vBMIjhaMNN1vr0fMsgOih007Ftwa7GZhJK4r69suj1zddggA78tTTE9daEZMeh15yGICPZHBukkJF79gmaiJcf1pQli2eqi8dd20RzZuXQOzhRkYbPTKx2RuWOmd1EXnTjYG6YL7fbIwHxyupNzIq5HNwF5oo4grNkv4XObTgmgfNdGPa79NaidIBPuzNH',
};

describe('create user', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('create_user');
    await startRedisConnection();
    // Mock fetch to simulate successful turnstile validation
    mock.method(
      global,
      'fetch',
      async () =>
        ({
          json: async () => ({ success: true }),
        }) as any,
    );
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  /**
   * @TODO Modify tests so that they are truly independent (do not depend on
   * each others results)
   */
  describe('happy paths', () => {
    test('it responds with 201 if user is created', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: USER_PAYLOAD,
      });
      const responseBody = JSON.parse(res.body);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(responseBody.email, USER_PAYLOAD.email);
      assert.strictEqual(responseBody.forename, USER_PAYLOAD.forename);
      assert.strictEqual(responseBody.surname, USER_PAYLOAD.surname);
      assert.strictEqual(responseBody.phoneNumber, USER_PAYLOAD.phoneNumber);
      assert.ok('id' in responseBody);
      assert.ok(!('password' in responseBody));
      assert.ok(!('salt' in responseBody));
    });

    test('it accepts utf-8 characters (🦴)', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: {
          email: 'pertti@sukeltaja.fi',
          phoneNumber: '00011',
          forename: '🦴',
          surname: '🦴',
          password: '🦴🦴🦴🦴🦴🦴🦴🦴',
          turnstileToken:
            '0H9sCE19DLgiaIBqjC6qTzYQb89Gk06cp60oX6j7K8YCr7mGCo0ddgZOj4J6G225BCjr2CZxfHeC082VUrdJ4fhfdMwfL3aLerRcdmQDuH8ypXeincJa5xWFjdHacljsXbZBUZGMcynpEcPmhtUsNYx7JMXLoyrSV0bYwnAfEUrhqC9NHbaLchQYbQXDrhGmD09ujj0tMARCnEZ0lOmgtHez6WYE9JG1QkJYnRj9CxrPqXItNxkv5uUl7Qel64pvZIW6KhaHjma13IaV5C3sZ5tBHRJRXVOSIpg0Sir1VAE9yNQsF0SJMwB9unOlC6t3Jt1oHy1vBMIjhaMNN1vr0fMsgOih007Ftwa7GZhJK4r69suj1zddggA78tTTE9daEZMeh15yGICPZHBukkJF79gmaiJcf1pQli2eqi8dd20RzZuXQOzhRkYbPTKx2RuWOmd1EXnTjYG6YL7fbIwHxyupNzIq5HNwF5oo4grNkv4XObTgmgfNdGPa79NaidIBPuzNH',
        },
      });
      const responseBody = JSON.parse(res.body);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(responseBody.forename, '🦴');
      assert.strictEqual(responseBody.surname, '🦴');
    });

    describe('complex emails', () => {
      test('weird', async () => {
        const server = await getTestInstance();
        const res = await server.inject({
          url: 'api/user',
          method: 'POST',
          payload: {
            ...USER_PAYLOAD,
            email: 'email@[123.123.123.123]',
            phoneNumber: '020204',
          },
        });
        assert.strictEqual(res.statusCode, 201);
      });

      test('+', async () => {
        const server = await getTestInstance();
        const res = await server.inject({
          url: 'api/user',
          method: 'POST',
          payload: {
            ...USER_PAYLOAD,
            email: 'ile+harrastussahkoposti@ilesoft.fi',
            phoneNumber: '020205',
          },
        });
        assert.strictEqual(res.statusCode, 201);
      });
    });
  });

  describe('unhappy paths', () => {
    test('it responds with 409 if email already exists with another user', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: {
          ...USER_PAYLOAD,
          email: 'admin@admin.com', // already exists
        },
      });

      assert.strictEqual(res.statusCode, 409);
    });

    test('it responds with 409 if phone number already exists with another user', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: {
          ...USER_PAYLOAD,
          email: 'example@example.com',
          phoneNumber: '00001', // already exists
        },
      });

      assert.strictEqual(res.statusCode, 409);
    });

    test('it responds with 400 if payload is missing', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('it responds with 400 if password is too short', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: {
          ...USER_PAYLOAD,
          password: '1234567',
        },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('it responds with 400 if forename is empty', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: {
          ...USER_PAYLOAD,
          forename: '',
        },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('it responds with 400 if forename is missing', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: {
          ...USER_PAYLOAD,
          email: 'erkki@sukeltaja.fi',
          surname: 'Nitikka',
          password: 'superhyväsalasana',
          forename: undefined,
        },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('it responds with 400 if turnstileToken is missing', async () => {
      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: {
          ...USER_PAYLOAD,
          turnstileToken: undefined,
        },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('it responds with 403 if turnstileToken validation fails', async () => {
      // Temporarily mock fetch to return failure
      mock.restoreAll();
      mock.method(global, 'fetch', async () => ({
        json: async () => ({ success: false }),
      }));

      const server = await getTestInstance();
      const res = await server.inject({
        url: 'api/user',
        method: 'POST',
        payload: USER_PAYLOAD,
      });

      assert.strictEqual(res.statusCode, 403);

      // Restore to return success for remaining tests
      mock.restoreAll();
      mock.method(global, 'fetch', async () => ({
        json: async () => ({ success: true }),
      }));
    });
  });
});
