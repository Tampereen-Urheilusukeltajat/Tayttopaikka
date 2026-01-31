import { describe, test } from 'node:test';
import assert from 'node:assert';
import { knexController } from '../../../database/database';
import { buildServer } from '../../../server';
import {
  createTestDatabase,
  dropTestDatabase,
  startRedisConnection,
  stopRedisConnection,
} from '../../../lib/utils/testUtils';

describe('Password can be changed', () => {
  const longTestTimeOut = 10000; // ms

  // @TODO: Fix this
  test.skip(
    'Password can be changed',
    async () => {
      const server = await buildServer({
        routePrefix: 'api',
      });

      await createTestDatabase('password_reset');
      await startRedisConnection();

      // @ts-expect-error: getMessage is injected to mock function
      sgMail.setMailWaiter();
      const resetRequestResponse = await server.inject({
        url: '/api/reset-password/reset-request',
        method: 'POST',
        payload: {
          email: 'e2e.user@example.com',
        },
      });

      assert.deepStrictEqual(resetRequestResponse.statusCode, 202);

      // @ts-expect-error: getMessage is injected to mock function
      const requestMessage: string = await sgMail.getMessage();

      const indexOfTokenString = requestMessage.indexOf('?token=') + 7;
      const token = requestMessage.substring(
        indexOfTokenString,
        indexOfTokenString + 36,
      );

      const indexOfUserIdString = requestMessage.indexOf('&id=') + 4;
      const userId = requestMessage.substring(
        indexOfUserIdString,
        indexOfUserIdString + 36,
      );

      // Try to reset with invalid token and login with it
      const setPasswordResponseWithInvalidToken = await server.inject({
        url: '/api/reset-password/set-password',
        method: 'POST',
        payload: {
          token: '56387c3d-145c-44e6-a037-9541848bc757',
          userId,
          password: 'rockYou.csv',
        },
      });

      assert.deepStrictEqual(
        setPasswordResponseWithInvalidToken.statusCode,
        204,
      );

      // Wait for possible unwanted password resetting to be done
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Login with old password => should be successful

      const validLoginWithOldPasswordResponse = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'e2e.user@example.com',
          password: 'password',
        },
      });

      assert.deepStrictEqual(validLoginWithOldPasswordResponse.statusCode, 200);

      // Try to log in with password that has been tried to be set

      const invalidLoginWithInvalidlyChangedPassword = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'e2e.user@example.com',
          password: 'rockYou.csv',
        },
      });

      assert.deepStrictEqual(
        invalidLoginWithInvalidlyChangedPassword.statusCode,
        401,
      );

      // @ts-expect-error: getMessage is injected to mock function
      sgMail.setMailWaiter();

      const setPasswordResponse = await server.inject({
        url: '/api/reset-password/set-password',
        method: 'POST',
        payload: {
          token,
          userId,
          password: 'rockYou.txt',
        },
      });

      assert.deepStrictEqual(setPasswordResponse.statusCode, 204);

      // @ts-expect-error: getMessage is injected to mock function
      const setMessage: string = await sgMail.getMessage();
      assert.ok(
        setMessage.includes(
          'Sait tämän viestin, koska olet vaihtanut salasanasi Tampereen Urheilusukeltajien Täyttöpaikka-palveluun.',
        ),
      );

      const oldPasswordLoginResponse = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'e2e.user@example.com',
          password: 'password',
        },
      });

      assert.deepStrictEqual(oldPasswordLoginResponse.statusCode, 401);

      const validLoginResponse = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'e2e.user@example.com',
          password: 'rockYou.txt',
        },
      });

      assert.deepStrictEqual(validLoginResponse.statusCode, 200);

      await dropTestDatabase();
      await knexController.destroy();
      await stopRedisConnection();
    },
    longTestTimeOut,
  );
});
