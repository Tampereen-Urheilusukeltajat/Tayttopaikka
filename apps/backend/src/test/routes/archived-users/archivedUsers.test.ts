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
import { CleanupAction } from '../../../types/userCleanup.types';

describe('Archived Users', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('archived_users');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server: FastifyInstance;
  let adminHeaders: { Authorization: string };
  let userHeaders: { Authorization: string };

  beforeEach(async () => {
    server = await getTestInstance();

    // Login as admin
    const adminLogin = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'admin@test.com',
        password: 'password',
      },
    });
    const adminTokens = JSON.parse(adminLogin.body);
    adminHeaders = {
      Authorization: 'Bearer ' + String(adminTokens.accessToken),
    };

    // Login as regular user
    const userLogin = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'regularuser@test.com',
        password: 'password',
      },
    });
    const userTokens = JSON.parse(userLogin.body);
    userHeaders = {
      Authorization: 'Bearer ' + String(userTokens.accessToken),
    };
  });

  afterEach(async () => {
    await server.close();
  });

  describe('GET /api/archived-users', () => {
    test('returns all archived users (not anonymized)', async () => {
      const res = await server.inject({
        url: '/api/archived-users',
        method: 'GET',
        headers: adminHeaders,
      });

      const body = JSON.parse(res.body);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(Array.isArray(body), true);
      assert.strictEqual(body.length, 2); // Two archived users in test data

      // Should be ordered by archivedAt DESC
      assert.strictEqual(body[0].id, 'bbb5abcd-53d4-11ed-9342-0242ac120002');
      assert.strictEqual(body[1].id, 'aaa5abcd-53d4-11ed-9342-0242ac120002');
    });

    test('returns correct user data structure', async () => {
      const res = await server.inject({
        url: '/api/archived-users',
        method: 'GET',
        headers: adminHeaders,
      });

      const body = JSON.parse(res.body);
      const user = body[0];

      assert.ok(user.id);
      assert.ok(user.email);
      assert.ok(user.forename);
      assert.ok(user.surname);
      assert.ok(user.lastLogin);
      assert.ok(user.archivedAt);
      assert.ok(typeof user.monthsInactive === 'number');
      assert.ok(typeof user.unpaidInvoicesCount === 'number');
    });

    test('correctly counts unpaid invoices', async () => {
      const res = await server.inject({
        url: '/api/archived-users',
        method: 'GET',
        headers: adminHeaders,
      });

      const body = JSON.parse(res.body);
      const userWithUnpaidInvoice = body.find(
        (u: { id: string }) => u.id === 'aaa5abcd-53d4-11ed-9342-0242ac120002',
      );

      // This user has one fill event with no payment
      assert.strictEqual(userWithUnpaidInvoice.unpaidInvoicesCount, 1);
    });

    test('does not return anonymized/deleted users', async () => {
      const res = await server.inject({
        url: '/api/archived-users',
        method: 'GET',
        headers: adminHeaders,
      });

      const body = JSON.parse(res.body);
      const anonymizedUser = body.find(
        (u: { id: string }) => u.id === 'ccc5abcd-53d4-11ed-9342-0242ac120002',
      );

      assert.strictEqual(anonymizedUser, undefined);
    });

    test('does not return active users', async () => {
      const res = await server.inject({
        url: '/api/archived-users',
        method: 'GET',
        headers: adminHeaders,
      });

      const body = JSON.parse(res.body);
      const activeUser = body.find(
        (u: { id: string }) => u.id === '54e3e8b0-53d4-11ed-9342-0242ac120002',
      );

      assert.strictEqual(activeUser, undefined);
    });

    test('returns 403 for non-admin users', async () => {
      const res = await server.inject({
        url: '/api/archived-users',
        method: 'GET',
        headers: userHeaders,
      });

      assert.strictEqual(res.statusCode, 403);
    });

    test('returns 401 for unauthenticated requests', async () => {
      const res = await server.inject({
        url: '/api/archived-users',
        method: 'GET',
      });

      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('POST /api/archived-users/:userId/unarchive', () => {
    test('successfully unarchives a user', async () => {
      const userId = 'aaa5abcd-53d4-11ed-9342-0242ac120002';

      const res = await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: adminHeaders,
      });

      const body = JSON.parse(res.body);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(body.message, 'User successfully unarchived');

      // Verify user is no longer archived
      const user = await getTestKnex()('user')
        .where({ id: userId })
        .first('archived_at');

      assert.strictEqual(user.archived_at, null);
    });

    test('restores associated diving cylinder sets', async () => {
      const userId = 'aaa5abcd-53d4-11ed-9342-0242ac120002';

      await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: adminHeaders,
      });

      // Verify cylinder sets are no longer archived
      const cylinderSets = await getTestKnex()('diving_cylinder_set')
        .where({ owner: userId })
        .select('id', 'archived');

      cylinderSets.forEach((set: { archived: number }) => {
        assert.strictEqual(set.archived, 0);
      });
    });

    test('creates audit log entry', async () => {
      const userId = 'aaa5abcd-53d4-11ed-9342-0242ac120002';
      const adminId = '1be5abcd-53d4-11ed-9342-0242ac120002';

      await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: adminHeaders,
      });

      // Verify audit log was created
      const auditLog = await getTestKnex()('user_cleanup_audit')
        .where({
          user_id: userId,
          action: CleanupAction.UNARCHIVE,
        })
        .first();

      assert.ok(auditLog);
      assert.strictEqual(auditLog.performed_by_user_id, adminId);
      assert.ok(auditLog.reason.includes('manually unarchived'));
    });

    test('returns 404 for non-existent user', async () => {
      const res = await server.inject({
        url: '/api/archived-users/00000000-0000-0000-0000-000000000000/unarchive',
        method: 'POST',
        headers: adminHeaders,
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('returns 404 for anonymized/deleted user', async () => {
      const userId = 'ccc5abcd-53d4-11ed-9342-0242ac120002';

      const res = await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: adminHeaders,
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('returns 404 for non-archived user', async () => {
      const userId = '54e3e8b0-53d4-11ed-9342-0242ac120002'; // Active user

      const res = await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: adminHeaders,
      });

      assert.strictEqual(res.statusCode, 404);
    });

    test('returns 403 for non-admin users', async () => {
      const userId = 'aaa5abcd-53d4-11ed-9342-0242ac120002';

      const res = await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: userHeaders,
      });

      assert.strictEqual(res.statusCode, 403);
    });

    test('returns 401 for unauthenticated requests', async () => {
      const userId = 'aaa5abcd-53d4-11ed-9342-0242ac120002';

      const res = await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
      });

      assert.strictEqual(res.statusCode, 401);
    });

    test('can unarchive user multiple times without error', async () => {
      const userId = 'bbb5abcd-53d4-11ed-9342-0242ac120002';

      // First unarchive
      const res1 = await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: adminHeaders,
      });

      assert.strictEqual(res1.statusCode, 200);

      // Try to unarchive again - should fail as user is no longer archived
      const res2 = await server.inject({
        url: `/api/archived-users/${userId}/unarchive`,
        method: 'POST',
        headers: adminHeaders,
      });

      assert.strictEqual(res2.statusCode, 404);
    });
  });
});
