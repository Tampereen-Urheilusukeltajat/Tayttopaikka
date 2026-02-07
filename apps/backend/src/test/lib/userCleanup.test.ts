import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import {
  createTestDatabase,
  dropTestDatabase,
  startRedisConnection,
  stopRedisConnection,
  getTestKnex,
} from '../../lib/utils/testUtils';
import {
  getInactiveUsers,
  getUsersArchivedForMonths,
  logCleanupAction,
  hasCleanupActionBeenPerformed,
  archiveUserForCleanup,
  anonymizeUserForCleanup,
} from '../../lib/queries/userCleanup';
import { CleanupAction } from '../../types/userCleanup.types';
import { setKnexInstance } from '../../database/database';

describe('User Cleanup Queries', () => {
  before(async () => {
    await createTestDatabase();
    await startRedisConnection();
    setKnexInstance(getTestKnex());
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  describe('getInactiveUsers', () => {
    test('returns users inactive for specified months', async () => {
      const knex = getTestKnex();

      // Insert test user with old last_login
      const userId = crypto.randomUUID();
      await knex('user').insert({
        id: userId,
        email: 'inactive@test.com',
        phone_number: '1234567890',
        forename: 'Inactive',
        surname: 'User',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.raw('DATE_SUB(NOW(), INTERVAL 37 MONTH)'),
      });

      const users = await getInactiveUsers(36);

      assert.ok(users.length === 1);
      const foundUser = users.find((u) => u.id === userId);
      assert.ok(foundUser);
      assert.strictEqual(foundUser.email, 'inactive@test.com');
      assert.ok(foundUser.monthsInactive >= 36);
    });

    test('excludes archived users when specified', async () => {
      const knex = getTestKnex();

      // Insert archived user
      const archivedUserId = crypto.randomUUID();
      await knex('user').insert({
        id: archivedUserId,
        email: 'archived@test.com',
        phone_number: '1234567891',
        forename: 'Archived',
        surname: 'User',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.raw('DATE_SUB(NOW(), INTERVAL 37 MONTH)'),
        archived_at: knex.fn.now(),
      });

      const users = await getInactiveUsers(36, true);
      const foundUser = users.find((u) => u.id === archivedUserId);

      assert.strictEqual(foundUser, undefined);
    });

    test('excludes deleted users by default', async () => {
      const knex = getTestKnex();

      // Insert deleted user
      const deletedUserId = crypto.randomUUID();
      await knex('user').insert({
        id: deletedUserId,
        email: null,
        phone_number: null,
        forename: null,
        surname: null,
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.raw('DATE_SUB(NOW(), INTERVAL 37 MONTH)'),
        deleted_at: knex.fn.now(),
      });

      const users = await getInactiveUsers(36);
      const foundUser = users.find((u) => u.id === deletedUserId);

      assert.strictEqual(foundUser, undefined);
    });
  });

  describe('getUsersArchivedForMonths', () => {
    test('returns users archived for specified months', async () => {
      const knex = getTestKnex();

      // Insert user archived 12 months ago
      const userId = crypto.randomUUID();
      await knex('user').insert({
        id: userId,
        email: 'archived12@test.com',
        phone_number: '1234567892',
        forename: 'Archived12',
        surname: 'User',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.raw('DATE_SUB(NOW(), INTERVAL 48 MONTH)'),
        archived_at: knex.raw('DATE_SUB(NOW(), INTERVAL 12 MONTH)'),
      });

      const users = await getUsersArchivedForMonths(12);

      const foundUser = users.find((u) => u.id === userId);
      assert.ok(foundUser);
      assert.strictEqual(foundUser.email, 'archived12@test.com');
    });

    test('excludes already deleted users', async () => {
      const knex = getTestKnex();

      // Insert archived and deleted user
      const userId = crypto.randomUUID();
      await knex('user').insert({
        id: userId,
        email: null,
        phone_number: null,
        forename: null,
        surname: null,
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.raw('DATE_SUB(NOW(), INTERVAL 48 MONTH)'),
        archived_at: knex.raw('DATE_SUB(NOW(), INTERVAL 12 MONTH)'),
        deleted_at: knex.fn.now(),
      });

      const users = await getUsersArchivedForMonths(12);
      const foundUser = users.find((u) => u.id === userId);

      assert.strictEqual(foundUser, undefined);
    });
  });

  describe('Cleanup Actions', () => {
    test('logCleanupAction creates audit record', async () => {
      const knex = getTestKnex();
      const userId = crypto.randomUUID();

      await knex('user').insert({
        id: userId,
        email: 'audittest@test.com',
        phone_number: '1234567893',
        forename: 'Audit',
        surname: 'Test',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.fn.now(),
      });

      await logCleanupAction(
        userId,
        CleanupAction.WARN_34_MONTHS,
        'Test warning',
        new Date(),
      );

      const audit = await knex('user_cleanup_audit')
        .where({ user_id: userId, action: CleanupAction.WARN_34_MONTHS })
        .first();

      assert.ok(audit);
      assert.strictEqual(audit.reason, 'Test warning');
    });

    test('hasCleanupActionBeenPerformed returns true when action exists', async () => {
      const knex = getTestKnex();
      const userId = crypto.randomUUID();

      await knex('user').insert({
        id: userId,
        email: 'checktest@test.com',
        phone_number: '1234567894',
        forename: 'Check',
        surname: 'Test',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.fn.now(),
      });

      // Initially should be false
      let hasAction = await hasCleanupActionBeenPerformed(
        userId,
        CleanupAction.ARCHIVE_36_MONTHS,
      );
      assert.strictEqual(hasAction, false);

      // Log the action
      await logCleanupAction(
        userId,
        CleanupAction.ARCHIVE_36_MONTHS,
        'Test archive',
        new Date(),
      );

      // Now should be true
      hasAction = await hasCleanupActionBeenPerformed(
        userId,
        CleanupAction.ARCHIVE_36_MONTHS,
      );
      assert.strictEqual(hasAction, true);
    });

    test('archiveUserForCleanup sets archived_at', async () => {
      const knex = getTestKnex();
      const userId = crypto.randomUUID();

      await knex('user').insert({
        id: userId,
        email: 'archivetest@test.com',
        phone_number: '1234567895',
        forename: 'Archive',
        surname: 'Test',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.fn.now(),
      });

      await archiveUserForCleanup(userId);

      const user = await knex('user').where({ id: userId }).first();
      assert.ok(user.archived_at);
    });

    test('anonymizeUserForCleanup clears PII and sets deleted_at', async () => {
      const knex = getTestKnex();
      const userId = crypto.randomUUID();

      await knex('user').insert({
        id: userId,
        email: 'anonymize@test.com',
        phone_number: '1234567896',
        forename: 'Anonymize',
        surname: 'Test',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.fn.now(),
      });

      await anonymizeUserForCleanup(userId);

      const user = await knex('user').where({ id: userId }).first();
      assert.strictEqual(user.email, null);
      assert.strictEqual(user.phone_number, null);
      assert.strictEqual(user.forename, null);
      assert.strictEqual(user.surname, null);
      assert.ok(user.deleted_at);
    });

    test('anonymizeUserForCleanup archives associated cylinder sets', async () => {
      const knex = getTestKnex();
      const userId = crypto.randomUUID();
      const cylinderId = crypto.randomUUID();

      await knex('user').insert({
        id: userId,
        email: 'cyltest@test.com',
        phone_number: '1234567897',
        forename: 'Cylinder',
        surname: 'Test',
        salt: 'salt',
        password_hash: 'hash',
        last_login: knex.fn.now(),
      });

      await knex('diving_cylinder_set').insert({
        id: cylinderId,
        name: 'Test Cylinder',
        owner: userId,
      });

      await anonymizeUserForCleanup(userId);

      const cylinder = await knex('diving_cylinder_set')
        .where({ id: cylinderId })
        .first();
      assert.strictEqual(cylinder.archived, 1); // Boolean stored as tinyint
    });
  });
});
