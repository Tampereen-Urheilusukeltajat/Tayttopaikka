import 'dotenv/config';

import { describe, test, mock, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { type UserResponse } from '../../types/user.types';
import { type EmailMessage } from '../../types/email.types';

const testUser: UserResponse = {
  id: 'user-id',
  email: 'user@test.com',
  phoneNumber: '0400000000',
  forename: 'Testi',
  surname: 'Käyttäjä',
  isUser: true,
  isAdmin: false,
  isBlender: false,
  isAdvancedBlender: false,
  isInstructor: false,
};

let sendUserStatusChangedEmail: (
  user: UserResponse,
  isActivated: boolean,
) => Promise<void>;
let sentMessages: EmailMessage[] = [];
let shouldThrow = false;

before(async () => {
  mock.module('../../lib/utils/sendEmail', {
    namedExports: {
      sendEmail: async (msg: EmailMessage) => {
        if (shouldThrow) throw new Error('boom');
        sentMessages.push(msg);
      },
    },
  });

  ({ sendUserStatusChangedEmail } = await import(
    '../../lib/utils/accessRightsChangeEmails.js'
  ));
});

beforeEach(() => {
  sentMessages = [];
  shouldThrow = false;
});

describe('sendUserStatusChangedEmail', () => {
  test('activation email includes a login link and the activation message in Finnish', async () => {
    await sendUserStatusChangedEmail(testUser, true);

    assert.strictEqual(sentMessages.length, 1);
    const [sentMessage] = sentMessages;
    assert.strictEqual(sentMessage.to, testUser.email);
    assert.match(sentMessage.text, /aktivoi/i);
    assert.match(sentMessage.text, /kirjaudu/i);
    assert.match(sentMessage.text, /https:\/\//);
  });

  test('deactivation email omits the login link and includes the deactivation message in Finnish', async () => {
    await sendUserStatusChangedEmail(testUser, false);

    assert.strictEqual(sentMessages.length, 1);
    const [sentMessage] = sentMessages;
    assert.strictEqual(sentMessage.to, testUser.email);
    assert.match(sentMessage.text, /poistanut/i);
    assert.doesNotMatch(sentMessage.text, /https:\/\//);
  });

  test('rethrows when sendEmail fails', async () => {
    shouldThrow = true;

    await assert.rejects(
      () => sendUserStatusChangedEmail(testUser, true),
      /boom/,
    );
  });
});
