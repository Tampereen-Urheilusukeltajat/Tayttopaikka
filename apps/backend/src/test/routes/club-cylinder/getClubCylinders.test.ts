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

describe('get club cylinder sets', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('get_club_cylinders');
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
    test('Regular user can get club cylinder sets (200)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: userHeaders,
      });

      assert.strictEqual(res.statusCode, 200);
      const result = JSON.parse(res.body);
      assert.ok(Array.isArray(result));
    });

    test('Unauthenticated user cannot get club cylinder sets (401)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
      });

      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Happy path', () => {
    test('Instructor can get all club cylinder sets (200)', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: instructorHeaders,
      });

      assert.strictEqual(res.statusCode, 200);
      const cylinders = JSON.parse(res.body);

      assert.ok(Array.isArray(cylinders));

      // Should only return club cylinders, not user cylinders
      for (const cylinderSet of cylinders) {
        assert.strictEqual(cylinderSet.isClubCylinder, true);
        assert.ok('id' in cylinderSet);
        assert.ok('name' in cylinderSet);
        assert.ok('cylinders' in cylinderSet);
        assert.ok(Array.isArray(cylinderSet.cylinders));
      }
    });

    test('Returns empty array if no club cylinders exist (200)', async () => {
      // Using a clean test database
      await dropTestDatabase();
      await createTestDatabase('empty_club_cylinders');

      server = await getTestInstance();
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

      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: instructorHeaders,
      });

      assert.strictEqual(res.statusCode, 200);
      const cylinders = JSON.parse(res.body);
      assert.ok(Array.isArray(cylinders));
      assert.strictEqual(cylinders.length, 0);
    });

    test('Does not return archived club cylinders', async () => {
      const res = await server.inject({
        url: '/api/club-cylinder',
        method: 'GET',
        headers: instructorHeaders,
      });

      assert.strictEqual(res.statusCode, 200);
      const cylinders = JSON.parse(res.body);

      // Verify none of the returned cylinders are archived
      // (This assumes test data has archived cylinders)
      for (const cylinderSet of cylinders) {
        assert.ok(!cylinderSet.archived || cylinderSet.archived === false);
      }
    });
  });
});
