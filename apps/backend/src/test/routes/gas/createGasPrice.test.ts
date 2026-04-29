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
import {
  type CreateGasPriceBody,
  type GasWithPricing,
} from '../../../types/gas.types';
import { buildServer } from '../../../server';

const VALID_PAYLOAD: CreateGasPriceBody = {
  activeFrom: new Date('2022-01-01').toISOString(),
  gasId: '3',
  priceEurCents: 4,
};

const VALID_PAYLOAD_NEW_HELIUM_PRICE: CreateGasPriceBody = {
  activeFrom: new Date('2023-02-01').toISOString(),
  gasId: '2',
  priceEurCents: 7,
};

const INVALID_PAYLOAD: Partial<CreateGasPriceBody> = {
  activeFrom: undefined,
  gasId: '1',
};

const INVALID_PAYLOAD_NON_EXISTENT_GAS: CreateGasPriceBody = {
  activeFrom: new Date('2022-01-01').toISOString(),
  gasId: '42',
  priceEurCents: 4,
};

describe('Create gas price', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('create_gas_price');
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
        email: 'test-admin@email.fi',
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
    test('responds 201 if the gas price has been created successfully', async () => {
      const res = await server.inject({
        headers,
        method: 'POST',
        payload: VALID_PAYLOAD,
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 201);
      const body: GasWithPricing = JSON.parse(res.body);

      assert.strictEqual(body.gasId, 3);
      assert.strictEqual(body.gasName, 'Oxygen');
      assert.strictEqual(body.priceEurCents, 4);
      assert.ok(body.gasPriceId);

      const [{ ...dbGP }] = await getTestKnex()('gas_price').where(
        'id',
        body.gasPriceId,
      );
      delete dbGP.created_at;
      delete dbGP.updated_at;
      assert.strictEqual(dbGP.gas_id, 3);
      assert.strictEqual(dbGP.price_eur_cents, 4);
    });

    test('creates new price and updates active_to of the previous Helium price', async () => {
      const [{ ...dbBeforeUpdatePreviousGP }] = await getTestKnex()(
        'gas_price',
      ).where('gas_id', '2').orderBy('id', 'asc').limit(1);

      const previousHeliumPriceId = dbBeforeUpdatePreviousGP.id;
      assert.ok(dbBeforeUpdatePreviousGP.active_to);

      const res = await server.inject({
        headers,
        method: 'POST',
        payload: VALID_PAYLOAD_NEW_HELIUM_PRICE,
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 201);
      const body: GasWithPricing = JSON.parse(res.body);

      assert.strictEqual(body.gasId, 2);
      assert.strictEqual(body.gasName, 'Helium');
      assert.strictEqual(body.priceEurCents, 7);
      assert.ok(body.gasPriceId);

      const [{ ...dbGP }] = await getTestKnex()('gas_price').where(
        'id',
        body.gasPriceId,
      );
      delete dbGP.created_at;
      delete dbGP.updated_at;
      assert.strictEqual(dbGP.gas_id, 2);
      assert.strictEqual(dbGP.price_eur_cents, 7);

      // Make sure it modified the existing Helium gas price and set active_to correctly
      const [{ ...dbPreviousGP }] = await getTestKnex()('gas_price').where(
        'id',
        previousHeliumPriceId,
      );

      assert.strictEqual(dbPreviousGP.gas_id, 2);
      assert.ok(dbPreviousGP.active_to);
    });
  });

  describe('Unhappy path', () => {
    test('responds 401 if authentication header was not provided', async () => {
      const res = await server.inject({
        method: 'POST',
        payload: VALID_PAYLOAD,
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 401);
    });

    test('responds 403 if user is not admin', async () => {
      const loginRes = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'test@email.fi',
          password: 'password',
        },
      });

      const tokens = JSON.parse(loginRes.body);
      const nonAdminHeaders = { Authorization: 'Bearer ' + String(tokens.accessToken) };

      const res = await server.inject({
        headers: nonAdminHeaders,
        method: 'POST',
        payload: VALID_PAYLOAD,
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 403);
    });

    test('responds 400 if required body property is missing', async () => {
      const res = await server.inject({
        headers,
        method: 'POST',
        payload: INVALID_PAYLOAD,
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 400);
      assert.strictEqual(
        JSON.parse(res.payload).message,
        "body must have required property 'priceEurCents'",
      );
    });

    test('responds 400 if it is not able to find gas with the given gasId', async () => {
      const res = await server.inject({
        headers,
        method: 'POST',
        payload: INVALID_PAYLOAD_NON_EXISTENT_GAS,
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 400);
      assert.strictEqual(JSON.parse(res.payload).message, 'Gas does not exist');
    });

    test('responds 400 if trying to change the Air price', async () => {
      const res = await server.inject({
        headers,
        method: 'POST',
        payload: { ...VALID_PAYLOAD, gasId: '1', activeFrom: new Date('2030-01-01').toISOString() },
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 400);
      assert.strictEqual(JSON.parse(res.payload).message, 'Air price cannot be changed');
    });

    test('responds 409 if a future price already exists for the gas', async () => {
      const futurePricePayload: CreateGasPriceBody = {
        gasId: '3',
        priceEurCents: 4,
        activeFrom: new Date('2030-01-01').toISOString(),
      };

      // Create the first future price
      await server.inject({
        headers,
        method: 'POST',
        payload: futurePricePayload,
        url: 'api/gas/price',
      });

      // Attempt to create a second future price for the same gas
      const res = await server.inject({
        headers,
        method: 'POST',
        payload: { ...futurePricePayload, activeFrom: new Date('2031-01-01').toISOString() },
        url: 'api/gas/price',
      });

      assert.deepStrictEqual(res.statusCode, 409);
      assert.strictEqual(
        JSON.parse(res.payload).message,
        'A future price already exists for this gas. Delete it first.',
      );
    });
  });
});
