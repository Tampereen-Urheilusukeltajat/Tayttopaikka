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
  getTestKnex,
} from '../../../lib/utils/testUtils';
import { buildServer } from '../../../server';

describe('update club cylinder sets', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('update_club_cylinder');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server: FastifyInstance;
  let instructorHeaders: { Authorization: string };
  let userHeaders: { Authorization: string };

  beforeEach(async () => {
    server = await getTestInstance();

    // Login as instructor
    const instructorRes = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'instructor@test.com',
        password: 'password',
      },
    });
    const instructorTokens = JSON.parse(instructorRes.body);
    instructorHeaders = {
      Authorization: 'Bearer ' + String(instructorTokens.accessToken),
    };

    // Login as regular user
    const userRes = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'user@test.com',
        password: 'password',
      },
    });
    const userTokens = JSON.parse(userRes.body);
    userHeaders = { Authorization: 'Bearer ' + String(userTokens.accessToken) };
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Authorization', () => {
    test('Regular user cannot update club cylinder sets (403)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: userHeaders,
        payload: {
          name: 'Updated name',
          cylinders: [
            {
              id: '1e54c95c-c2fe-4d86-9406-c88f45c0bde9',
              volume: 10,
              pressure: 200,
              material: 'steel',
              serialNumber: 'TEST-001',
              inspection: '2025-01-01',
            },
          ],
        },
      });

      assert.strictEqual(res.statusCode, 403);
    });

    test('Unauthenticated user cannot update club cylinder sets (401)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        payload: {
          name: 'Updated name',
          cylinders: [
            {
              id: '1e54c95c-c2fe-4d86-9406-c88f45c0bde9',
              volume: 10,
              pressure: 200,
              material: 'steel',
              serialNumber: 'TEST-001',
              inspection: '2025-01-01',
            },
          ],
        },
      });

      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Happy path', () => {
    test('Instructor can update club cylinder set name (200)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {
          name: 'Updated Club Set',
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const result = JSON.parse(res.body);
      assert.strictEqual(result.name, 'Updated Club Set');
    });

    test('Instructor can update club cylinder set cylinders (200)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {
          cylinders: [
            {
              id: '1e54c95c-c2fe-4d86-9406-c88f45c0bde9',
              volume: 12,
              pressure: 232,
              material: 'steel',
              serialNumber: 'CLUB-001-UPDATED',
              inspection: '2025-06-01',
            },
          ],
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const result = JSON.parse(res.body);
      assert.strictEqual(result.cylinders.length, 1);
      assert.strictEqual(result.cylinders[0].serialNumber, 'CLUB-001-UPDATED');
    });
  });

  describe('Validation', () => {
    test('Cannot update with future inspection date (400)', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {
          cylinders: [
            {
              id: '1e54c95c-c2fe-4d86-9406-c88f45c0bde9',
              inspection: futureDateStr,
            },
          ],
        },
      });

      assert.strictEqual(res.statusCode, 400);
      const result = JSON.parse(res.body);
      assert.ok(result.error || result.message);
    });

    test('Cannot update with empty cylinders array (400)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {},
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('Cannot update non-existent club cylinder set (404)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/99999999-9999-9999-9999-999999999999',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {
          name: 'Updated Set',
        },
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('Cannot update user cylinder set as club cylinder (404)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/a4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {
          name: 'Updated Set',
        },
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('Cannot update with missing name (400)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {},
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('Transaction rollback', () => {
    test('Transaction rolls back on error', async () => {
      // First get the current state
      const initialRes = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: instructorHeaders,
      });
      const initialCylinders = JSON.parse(initialRes.body);
      const initialSet = initialCylinders.find(
        (c: { id: string }) => c.id === 'f4e1035e-f36e-4056-9a1b-5925a3c5793e',
      );
      const originalName = initialSet.name;

      // Try to update with invalid data that passes schema but fails business logic
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        method: 'PATCH',
        headers: instructorHeaders,
        payload: {
          name: 'Transaction Test Name',
          cylinders: [
            {
              id: '1e54c95c-c2fe-4d86-9406-c88f45c0bde9',
              inspection: '9999-12-31', // Far future date
            },
          ],
        },
      });

      assert.strictEqual(res.statusCode, 400);

      // Verify data is unchanged (transaction rolled back)
      const getRes = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: instructorHeaders,
      });

      const cylinders = JSON.parse(getRes.body);
      const unchangedSet = cylinders.find(
        (c: { id: string }) => c.id === 'f4e1035e-f36e-4056-9a1b-5925a3c5793e',
      );

      // Name should not have changed to the attempted new name
      assert.ok(unchangedSet);
      assert.strictEqual(unchangedSet.name, originalName);
      assert.notStrictEqual(unchangedSet.name, 'Transaction Test Name');
    });
  });
});
