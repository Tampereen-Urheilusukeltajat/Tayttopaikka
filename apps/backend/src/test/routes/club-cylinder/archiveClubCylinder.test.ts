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

describe('archive club cylinder sets', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('archive_club_cylinder');
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
    test('Regular user cannot archive club cylinder sets (403)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e/archive',
        method: 'PATCH',
        headers: userHeaders,
      });

      assert.strictEqual(res.statusCode, 403);
    });

    test('Unauthenticated user cannot archive club cylinder sets (401)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e/archive',
        method: 'PATCH',
      });

      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Happy path', () => {
    test('Instructor can archive club cylinder set (200)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/f4e1035e-f36e-4056-9a1b-5925a3c5793e/archive',
        method: 'PATCH',
        headers: instructorHeaders,
      });

      assert.strictEqual(res.statusCode, 200);
      const result = JSON.parse(res.body);
      assert.strictEqual(
        result.divingCylinderSetId,
        'f4e1035e-f36e-4056-9a1b-5925a3c5793e',
      );
    });

    test('Archived cylinder does not appear in GET list', async () => {
      // Use a different cylinder ID (b4e1035e...) for this test
      // First get initial list
      const initialRes = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: instructorHeaders,
      });
      const initialCylinders = JSON.parse(initialRes.body);
      const cylinderToArchive = initialCylinders.find(
        (c: { id: string }) => c.id === 'b4e1035e-f36e-4056-9a1b-5925a3c5793e',
      );
      assert.ok(cylinderToArchive, 'Cylinder should exist before archiving');

      // Archive cylinder
      await server.inject({
        url: '/api/club-cylinder/b4e1035e-f36e-4056-9a1b-5925a3c5793e/archive',
        method: 'PATCH',
        headers: instructorHeaders,
      });

      // Get list again
      const afterRes = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: instructorHeaders,
      });
      const afterCylinders = JSON.parse(afterRes.body);
      const archivedCylinder = afterCylinders.find(
        (c: { id: string }) => c.id === 'b4e1035e-f36e-4056-9a1b-5925a3c5793e',
      );

      assert.strictEqual(
        archivedCylinder,
        undefined,
        'Archived cylinder should not appear in list',
      );
    });

    test('Archiving is idempotent (200 when archiving already archived)', async () => {
      // Use a different cylinder ID (c4e1035e...) for this test
      // Archive first time
      const firstRes = await server.inject({
        url: '/api/club-cylinder/c4e1035e-f36e-4056-9a1b-5925a3c5793e/archive',
        method: 'PATCH',
        headers: instructorHeaders,
      });
      assert.strictEqual(firstRes.statusCode, 200);

      // Archive second time
      const secondRes = await server.inject({
        url: '/api/club-cylinder/c4e1035e-f36e-4056-9a1b-5925a3c5793e/archive',
        method: 'PATCH',
        headers: instructorHeaders,
      });
      assert.strictEqual(secondRes.statusCode, 200);
      const result = JSON.parse(secondRes.body);
      assert.strictEqual(
        result.divingCylinderSetId,
        'c4e1035e-f36e-4056-9a1b-5925a3c5793e',
      );
    });
  });

  describe('Validation', () => {
    test('Cannot archive non-existent club cylinder set (404)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/99999999-9999-9999-9999-999999999999/archive',
        method: 'PATCH',
        headers: instructorHeaders,
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('Cannot archive user cylinder set as club cylinder (404)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/a4e1035e-f36e-4056-9a1b-5925a3c5793e/archive',
        method: 'PATCH',
        headers: instructorHeaders,
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('Invalid cylinder ID format returns 400', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder/invalid/archive',
        method: 'PATCH',
        headers: instructorHeaders,
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });
});
