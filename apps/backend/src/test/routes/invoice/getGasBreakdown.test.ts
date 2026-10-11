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
import { type GasBreakdownRow } from '../../../types/invoices.types';

describe('Get gas breakdown', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('get_invoices');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server: FastifyInstance;
  let headers: { Authorization: string };
  beforeEach(async () => {
    server = await getTestInstance();
    const res = await server.inject({
      url: '/api/login',
      method: 'POST',
      payload: {
        email: 'admin@test.com',
        password: 'password',
      },
    });
    const tokens = JSON.parse(res.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Happy path', () => {
    test('responds with pending revenue grouped by gas type, excluding Air', async () => {
      const res = await server.inject({
        headers,
        method: 'GET',
        url: 'api/invoicing/gas-breakdown',
      });

      assert.deepStrictEqual(res.statusCode, 200);
      const body = JSON.parse(res.body) as GasBreakdownRow[];

      // Air (gas id 1) must never appear, even though fe2 is an air fill
      assert.ok(!body.some((row) => row.gasId === 1));

      // fe3 is a Trimix fill (He 500L x 300 + O2 300L x 150), split across
      // both Helium and Oxygen. fe4 + fe5 are He-only fills (5000L x 100).
      // fe6 contributes 0L of Helium, so it adds nothing.
      // Helium = 500*300 (fe3) + 5000*100 (fe4) + 5000*100 (fe5) = 1 150 000
      const helium = body.find((row) => row.gasId === 2);
      assert.ok(helium, 'Helium row should exist');
      assert.strictEqual(helium.gasName, 'Helium');
      assert.strictEqual(helium.priceEurCents, 1150000);

      // Oxygen = 300*150 (fe3) = 45 000
      const oxygen = body.find((row) => row.gasId === 3);
      assert.ok(oxygen, 'Oxygen row should exist');
      assert.strictEqual(oxygen.gasName, 'Oxygen');
      assert.strictEqual(oxygen.priceEurCents, 45000);

      // No Argon fills exist in the fixture data, so it should be omitted
      // entirely rather than returned as a zero row.
      assert.ok(!body.some((row) => row.gasId === 4));

      // Diluent = fe7's pre-computed price (15 000), attributed in full to
      // Diluent rather than split between Helium/Oxygen.
      const diluent = body.find((row) => row.gasId === 5);
      assert.ok(diluent, 'Diluent row should exist');
      assert.strictEqual(diluent.gasName, 'Diluent');
      assert.strictEqual(diluent.priceEurCents, 15000);
    });
  });

  describe('Unhappy path', () => {
    test('responds 401 if authentication header was not provided', async () => {
      const res = await server.inject({
        method: 'GET',
        url: 'api/invoicing/gas-breakdown',
      });

      assert.deepStrictEqual(res.statusCode, 401);
    });

    test('responds 403 if the user is not an admin', async () => {
      const loginRes = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'user@test.com',
          password: 'password',
        },
      });
      const tokens = JSON.parse(loginRes.body);
      headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };

      const res = await server.inject({
        headers,
        method: 'GET',
        url: 'api/invoicing/gas-breakdown',
      });

      assert.deepStrictEqual(res.statusCode, 403);
    });
  });
});
