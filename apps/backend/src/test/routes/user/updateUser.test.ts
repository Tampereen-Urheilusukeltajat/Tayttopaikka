import {
  describe,
  test,
  before,
  after,
  beforeEach,
  afterEach,
} from 'node:test';
import assert from 'node:assert';
// import { type FastifyInstance } from 'fastify';
// import { buildServer } from '../../../server';
import {
  createTestDatabase,
  dropTestDatabase,
  startRedisConnection,
  stopRedisConnection,
  getTestKnex,
} from '../../../lib/utils/testUtils';
import bcrypt from 'bcrypt';
import { type FastifyInstance } from 'fastify';
import { buildServer } from '../../../server';

const USER_UPDATE = {
  phoneNumber: '00010',
  forename: 'Edited',
  surname: 'Change',
};

const CURRENT_PASSWORD = 'thisIsMyCurrentPassword';

describe('update user', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('update_user');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server;
  let headers: object;
  beforeEach(async () => {
    server = await getTestInstance();
    const res = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'test@email.fi',
        password: 'password',
      },
    });
    const tokens = JSON.parse(res.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Happy cases', () => {
    test('it returns user with updated values', async () => {
      const id = '1be5abcd-53d4-11ed-9342-0242ac120002';
      const res = await server.inject({
        url: `api/user/${id}`,
        payload: USER_UPDATE,
        method: 'PATCH',
        headers,
      });

      const resBody = JSON.parse(res.body);
      assert.deepStrictEqual(res.statusCode, 200);
      assert.strictEqual(resBody.email, 'test@email.fi');
      assert.strictEqual(resBody.forename, 'Edited');
      assert.strictEqual(resBody.surname, 'Change');
      assert.strictEqual(resBody.phoneNumber, '00010');
      assert.strictEqual(resBody.isBlender, true);
    });

    test('it returns 200 when updating values and passing current email & phone', async () => {
      const logRes = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'testi2@email.fi',
          password: 'password',
        },
      });
      const tokens = JSON.parse(logRes.body);
      headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

      const id = '54e3e8b0-53d4-11ed-9342-0242ac120002';
      const res = await server.inject({
        url: `api/user/${id}/`,
        payload: {
          ...USER_UPDATE,
          email: 'testi2@email.fi',
          phoneNumber: '00002',
          currentPassword: 'password',
        },
        method: 'PATCH',
        headers,
      });

      const resBody = JSON.parse(res.body);
      assert.deepStrictEqual(res.statusCode, 200);
      assert.strictEqual(resBody.email, 'testi2@email.fi');
      assert.strictEqual(resBody.forename, 'Edited');
      assert.strictEqual(resBody.surname, 'Change');
      assert.strictEqual(resBody.phoneNumber, '00002');
    });

    test('it allows updating password and does not store plain text password to db', async () => {
      const password = 'plainpassword';
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        payload: { password, currentPassword: 'password' },
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 200);

      const response = await getTestKnex()
        .select(['password_hash', 'salt'])
        .from('user')
        .where('id', '1be5abcd-53d4-11ed-9342-0242ac120002');

      assert.notStrictEqual(response[0].password_hash, password);
      assert.ok(bcrypt.compareSync(password, response[0].password_hash));

      // Restore the original password so subsequent tests work
      await getTestKnex()('user')
        .where('id', '1be5abcd-53d4-11ed-9342-0242ac120002')
        .update({
          password_hash:
            '$2b$10$ikF8ObO.XnH2ItBkKcMZaufzOadky6bRVfQ7.JOOoGo3o8xBWadYy',
          salt: '$2b$10$ikF8ObO.XnH2ItBkKcMZau',
        });
    });
  });

  describe('Negative cases', () => {
    test('it returns 400 when invalid body parameter.', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        // incorrect payload
        payload: { kakka: '1234' },
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 400);

      const resBody = JSON.parse(res.body);

      assert.ok('error' in resBody);
      assert.ok('message' in resBody);
    });

    test('it returns 400 when empty body.', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        // incorrect payload
        payload: {},
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 400);

      const resBody = JSON.parse(res.body);

      assert.ok('error' in resBody);
      assert.ok('message' in resBody);
    });

    test('it returns 409 when email already in use.', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        // incorrect payload type
        payload: {
          ...USER_UPDATE,
          email: 'alreadyin@use.fi',
          currentPassword: 'password',
        },
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 409);

      const resBody = JSON.parse(res.body);

      assert.ok('error' in resBody);
      assert.ok('message' in resBody);
    });

    test('it returns 409 when phone already in use.', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        // incorrect payload type
        payload: { ...USER_UPDATE, phoneNumber: '00002' },
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 409);

      const resBody = JSON.parse(res.body);

      assert.ok('error' in resBody);
      assert.ok('message' in resBody);
    });

    test('it returns 400 if user tries to update password without giving the current password', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        payload: { password: 'wowlolhehhe' },
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.message, 'Current password is required');
      assert.strictEqual(body.statusCode, 400);
    });

    test('it returns 400 if user tries to update email without giving the current password', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        payload: { email: 'wowlolhehhe@robot.com' },
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.message, 'Current password is required');
      assert.strictEqual(body.statusCode, 400);
    });

    test('it returns 400 if user gives wrong current password', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002/',
        payload: {
          email: 'wowlolhehhe@robot.com',
          password: 'wowlolhehhe',
          currentPassword: 'Moro :D',
        },
        method: 'PATCH',
        headers,
      });

      assert.deepStrictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.message, 'Invalid current password');
      assert.strictEqual(body.statusCode, 400);
    });
  });

  describe('last test case which breaks everything please fix', () => {
    test('it archives user', async () => {
      const res = await server.inject({
        url: 'api/user/1be5abcd-53d4-11ed-9342-0242ac120002',
        payload: {
          archive: true,
        },
        method: 'PATCH',
        headers,
      });
      const resBody = JSON.parse(res.body);

      assert.deepStrictEqual(res.statusCode, 200);
      assert.ok(resBody.archivedAt !== '');
    });
  });
});
