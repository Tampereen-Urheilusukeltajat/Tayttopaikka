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

describe('create club cylinder set', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('create_club_cylinder');
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
    test('Regular user cannot create club cylinder set (403)', async () => {
      const payload = {
        name: 'Club D12',
        cylinders: [
          {
            volume: 12,
            pressure: 232,
            material: 'steel',
            serialNumber: 'CLUB001',
            inspection: '2024-01-01',
          },
        ],
      };

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'POST',
        headers: userHeaders,
        payload,
      });

      assert.strictEqual(res.statusCode, 403);
    });

    test('Unauthenticated user cannot create club cylinder set (401)', async () => {
      const payload = {
        name: 'Club D12',
        cylinders: [
          {
            volume: 12,
            pressure: 232,
            material: 'steel',
            serialNumber: 'CLUB001',
            inspection: '2024-01-01',
          },
        ],
      };

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'POST',
        payload,
      });

      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Happy path', () => {
    test('Instructor can create club cylinder set with single cylinder (201)', async () => {
      const payload = {
        name: 'Club D12',
        cylinders: [
          {
            volume: 12,
            pressure: 232,
            material: 'steel',
            serialNumber: 'CLUB001',
            inspection: '2024-01-01',
          },
        ],
      };

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'POST',
        headers: instructorHeaders,
        payload,
      });

      assert.strictEqual(res.statusCode, 201);
      const responseBody = JSON.parse(res.body);

      assert.ok('id' in responseBody);
      assert.strictEqual(responseBody.name, payload.name);
      assert.strictEqual(responseBody.isClubCylinder, true);
      assert.strictEqual(responseBody.cylinders.length, 1);
      assert.ok('id' in responseBody.cylinders[0]);
      assert.strictEqual(
        responseBody.cylinders[0].volume,
        payload.cylinders[0].volume,
      );
      assert.strictEqual(
        responseBody.cylinders[0].pressure,
        payload.cylinders[0].pressure,
      );
      assert.strictEqual(
        responseBody.cylinders[0].serialNumber,
        payload.cylinders[0].serialNumber,
      );
    });

    test('Instructor can create club cylinder set with multiple cylinders (201)', async () => {
      const payload = {
        name: 'Club Twins',
        cylinders: [
          {
            volume: 10,
            pressure: 300,
            material: 'steel',
            serialNumber: 'TWIN001',
            inspection: '2024-01-01',
          },
          {
            volume: 10,
            pressure: 300,
            material: 'steel',
            serialNumber: 'TWIN002',
            inspection: '2024-01-01',
          },
        ],
      };

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'POST',
        headers: instructorHeaders,
        payload,
      });

      assert.strictEqual(res.statusCode, 201);
      const responseBody = JSON.parse(res.body);

      assert.ok('id' in responseBody);
      assert.strictEqual(responseBody.name, payload.name);
      assert.strictEqual(responseBody.isClubCylinder, true);
      assert.strictEqual(responseBody.cylinders.length, 2);

      // Verify both cylinders
      const serialNumbers = responseBody.cylinders.map(
        (c: any) => c.serialNumber,
      );
      assert.ok(serialNumbers.includes('TWIN001'));
      assert.ok(serialNumbers.includes('TWIN002'));
    });
  });

  describe('Validation', () => {
    test('Rejects future inspection date (400)', async () => {
      const payload = {
        name: 'Club Bad Date',
        cylinders: [
          {
            volume: 12,
            pressure: 232,
            material: 'steel',
            serialNumber: 'BAD001',
            inspection: '2030-01-01',
          },
        ],
      };

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'POST',
        headers: instructorHeaders,
        payload,
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('Rejects empty cylinders array (400)', async () => {
      const payload = {
        name: 'Club No Cylinders',
        cylinders: [],
      };

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'POST',
        headers: instructorHeaders,
        payload,
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('Rejects missing name (400)', async () => {
      const payload = {
        cylinders: [
          {
            volume: 12,
            pressure: 232,
            material: 'steel',
            serialNumber: 'CLUB001',
            inspection: '2024-01-01',
          },
        ],
      };

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'POST',
        headers: instructorHeaders,
        payload,
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });
});
