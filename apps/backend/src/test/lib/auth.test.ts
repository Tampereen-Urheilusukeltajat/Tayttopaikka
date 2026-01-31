import { describe, test } from 'node:test';
import assert from 'node:assert';
import { hashPassword } from '../../lib/auth/auth';

describe('Hash password', () => {
  test('hash is not plain password', async () => {
    const testPass = 'testpass123';
    const hashObj = await hashPassword(testPass);

    // bcrypt hash should always 60 characters long.
    const hashLength = hashObj.hash.length;
    assert.strictEqual(hashLength, 60);

    assert.notStrictEqual(hashObj.hash, testPass);
    assert.notStrictEqual(hashObj.hash, undefined);
    assert.notStrictEqual(hashObj.salt, undefined);
  });
});
