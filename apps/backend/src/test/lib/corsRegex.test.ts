import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { makeCorsRegex } from '../../lib/utils/corsRegex';

describe('CORS origin regex', () => {
  const hostname = 'tayttopaikka.fi';
  const corsRegex = makeCorsRegex(hostname);

  it('allows root domain', () => {
    assert.strictEqual(corsRegex.test('https://tayttopaikka.fi'), true);
    assert.strictEqual(corsRegex.test('http://tayttopaikka.fi'), true);
    assert.strictEqual(corsRegex.test('tayttopaikka.fi'), true);
  });

  it('allows www subdomain', () => {
    assert.strictEqual(corsRegex.test('https://www.tayttopaikka.fi'), true);
    assert.strictEqual(corsRegex.test('http://www.tayttopaikka.fi'), true);
  });

  it('allows other subdomains', () => {
    assert.strictEqual(corsRegex.test('https://app.tayttopaikka.fi'), true);
    assert.strictEqual(
      corsRegex.test('http://subdomain.tayttopaikka.fi'),
      true,
    );
    assert.strictEqual(corsRegex.test('https://a.b.c.tayttopaikka.fi'), true);
  });

  it('blocks similar but invalid domains', () => {
    assert.strictEqual(corsRegex.test('https://tayttopaikka.com'), false);
    assert.strictEqual(
      corsRegex.test('https://tayttopaikka.fi.evil.com'),
      false,
    );
    assert.strictEqual(corsRegex.test('https://evil-tayttopaikka.fi'), false);
  });

  it('allows any port', () => {
    assert.strictEqual(corsRegex.test('https://tayttopaikka.fi:3000'), true);
    assert.strictEqual(
      corsRegex.test('https://app.tayttopaikka.fi:8080'),
      true,
    );
    assert.strictEqual(corsRegex.test('http://tayttopaikka.fi:9999'), true);
  });

  it('blocks completely different domains', () => {
    assert.strictEqual(corsRegex.test('https://malicious.com'), false);
    assert.strictEqual(corsRegex.test('http://localhost'), false);
    assert.strictEqual(corsRegex.test('https://127.0.0.1'), false);
  });
});
