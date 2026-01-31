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
import { buildServer } from '../../../server';
import {
  createTestDatabase,
  dropTestDatabase,
  startRedisConnection,
  stopRedisConnection,
  getTestKnex,
} from '../../../lib/utils/testUtils';

describe('Password reset request', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('password_reset');
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

  let server;
  beforeEach(async () => {
    server = await getTestInstance();
  });

  afterEach(async () => {
    await server.close();
  });

  test('It returns 202 for existing user', async () => {
    const res = await server.inject({
      url: '/api/reset-password/reset-request',
      method: 'POST',
      payload: {
        email: 'user@example.com',
        turnstileToken:
          '0H9sCE19DLgiaIBqjC6qTzYQb89Gk06cp60oX6j7K8YCr7mGCo0ddgZOj4J6G225BCjr2CZxfHeC082VUrdJ4fhfdMwfL3aLerRcdmQDuH8ypXeincJa5xWFjdHacljsXbZBUZGMcynpEcPmhtUsNYx7JMXLoyrSV0bYwnAfEUrhqC9NHbaLchQYbQXDrhGmD09ujj0tMARCnEZ0lOmgtHez6WYE9JG1QkJYnRj9CxrPqXItNxkv5uUl7Qel64pvZIW6KhaHjma13IaV5C3sZ5tBHRJRXVOSIpg0Sir1VAE9yNQsF0SJMwB9unOlC6t3Jt1oHy1vBMIjhaMNN1vr0fMsgOih007Ftwa7GZhJK4r69suj1zddggA78tTTE9daEZMeh15yGICPZHBukkJF79gmaiJcf1pQli2eqi8dd20RzZuXQOzhRkYbPTKx2RuWOmd1EXnTjYG6YL7fbIwHxyupNzIq5HNwF5oo4grNkv4XObTgmgfNdGPa79NaidIBPuzNH',
      },
    });

    assert.strictEqual(res.statusCode, 202);
  });

  test('It returns 202 for nonexistent user', async () => {
    const res = await server.inject({
      url: '/api/reset-password/reset-request',
      method: 'POST',
      payload: {
        email: 'nonexistent.user@example.com',
        turnstileToken:
          '0H9sCE19DLgiaIBqjC6qTzYQb89Gk06cp60oX6j7K8YCr7mGCo0ddgZOj4J6G225BCjr2CZxfHeC082VUrdJ4fhfdMwfL3aLerRcdmQDuH8ypXeincJa5xWFjdHacljsXbZBUZGMcynpEcPmhtUsNYx7JMXLoyrSV0bYwnAfEUrhqC9NHbaLchQYbQXDrhGmD09ujj0tMARCnEZ0lOmgtHez6WYE9JG1QkJYnRj9CxrPqXItNxkv5uUl7Qel64pvZIW6KhaHjma13IaV5C3sZ5tBHRJRXVOSIpg0Sir1VAE9yNQsF0SJMwB9unOlC6t3Jt1oHy1vBMIjhaMNN1vr0fMsgOih007Ftwa7GZhJK4r69suj1zddggA78tTTE9daEZMeh15yGICPZHBukkJF79gmaiJcf1pQli2eqi8dd20RzZuXQOzhRkYbPTKx2RuWOmd1EXnTjYG6YL7fbIwHxyupNzIq5HNwF5oo4grNkv4XObTgmgfNdGPa79NaidIBPuzNH',
      },
    });

    assert.strictEqual(res.statusCode, 202);
  });
});
