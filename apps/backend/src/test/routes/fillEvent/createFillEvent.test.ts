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

describe('create fill event', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      knex: getTestKnex(),
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('create_fill_event');
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

  describe('successful', () => {
    after(async () => {
      // delete successful fill events
      await getTestKnex()('fill_event_gas_fill').del();
      await getTestKnex()('fill_event').del();
    });

    test('it creates a new fill event with only compressed air', async () => {
      const payload = {
        cylinderSetId: 'a4e1035e-f36e-4056-9a1b-5925a3c5793e', // single cylinder set
        gasMixture: 'Paineilma',
        filledAir: true,
        storageCylinderUsageArr: [],
        price: 0,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: payload,
        headers,
      });

      const resBody = JSON.parse(res.body);
      assert.deepStrictEqual(res.statusCode, 201);
      assert.deepStrictEqual(resBody.price, 0);

      const fillEvent = await getTestKnex()('fill_event')
        .where('id', resBody.id)
        .select();
      const fillEventGasFills = await getTestKnex()('fill_event_gas_fill')
        .where('fill_event_id', resBody.id)
        .select();
      assert.strictEqual(fillEvent.length, 1);
      assert.strictEqual(fillEventGasFills.length, 1);
    });

    test('it creates a new fill event with blender privileges', async () => {
      const PAYLOAD = {
        cylinderSetId: 'b4e1035e-f36e-4056-9a1b-5925a3c5793e',
        gasMixture: 'seos',
        filledAir: false,
        storageCylinderUsageArr: [
          {
            storageCylinderId: 1,
            startPressure: 10,
            endPressure: 8,
          },
          {
            storageCylinderId: 5,
            startPressure: 13.5,
            endPressure: 10.2,
          },
        ],
        description: 'Tämä on jonkinlainen seos',
        price: 0,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      const resBody = JSON.parse(res.body);

      // TODO Create more complex test
      const expectedPrice = 0;
      // const expectedPrice =
      //   (PAYLOAD.storageCylinderUsageArr[0].startPressure -
      //     PAYLOAD.storageCylinderUsageArr[0].endPressure) *
      //     50 *
      //     300 +
      //   Math.ceil(
      //     PAYLOAD.storageCylinderUsageArr[1].startPressure -
      //       PAYLOAD.storageCylinderUsageArr[1].endPressure
      //   ) *
      //     50 *
      //     150;
      assert.deepStrictEqual(res.statusCode, 201);
      assert.deepStrictEqual(resBody.price, expectedPrice);

      const fillEvent = await getTestKnex()('fill_event')
        .where('id', resBody.id)
        .select();
      const fillEventGasFills = await getTestKnex()('fill_event_gas_fill')
        .where('fill_event_id', resBody.id)
        .select();
      assert.strictEqual(fillEvent.length, 1);
      assert.strictEqual(fillEventGasFills.length, 2);
    });

    test('it can link compressor to the fill event', async () => {
      const compressorId = '54e3e8b0-53d4-11ed-9342-0242ac120002';

      const payload = {
        cylinderSetId: 'a4e1035e-f36e-4056-9a1b-5925a3c5793e', // single cylinder set
        gasMixture: 'Paineilma',
        filledAir: true,
        storageCylinderUsageArr: [],
        price: 0,
        compressorId,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: payload,
        headers,
      });

      const resBody = JSON.parse(res.body);
      assert.deepStrictEqual(res.statusCode, 201);
      assert.deepStrictEqual(resBody.price, 0);
      assert.deepStrictEqual(resBody.compressorId, compressorId);

      const fillEvent = await getTestKnex()('fill_event')
        .where('id', resBody.id)
        .select();

      assert.strictEqual(fillEvent.length, 1);
      assert.deepStrictEqual(fillEvent[0].compressor_id, compressorId);
    });
  });

  describe('unsuccessful', () => {
    afterEach(async () => {
      const fillEvents = await getTestKnex()('fill_event').select();
      const fillEventGasFills = await getTestKnex()(
        'fill_event_gas_fill',
      ).select();
      assert.strictEqual(fillEvents.length, 0);
      assert.strictEqual(fillEventGasFills.length, 0);
    });

    test('it fails when no gases are given', async () => {
      const PAYLOAD = {
        cylinderSetId: 'f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        gasMixture: 'no gas',
        filledAir: false,
        storageCylinderUsageArr: [],
        description: 'Tämä on ylimääräistä infoa',
        price: 0,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.deepStrictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.deepStrictEqual(body.message, 'No gases were given');
    });

    test('it fails with invalid cylinder set', async () => {
      const PAYLOAD = {
        cylinderSetId: 'a4e1035e-f36e-4056-9a1b-696969696969',
        gasMixture: 'invalid cylinder set',
        filledAir: true,
        storageCylinderUsageArr: [],
        description: 'Tämä on ylimääräistä infoa',
        price: 0,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.deepStrictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.deepStrictEqual(body.message, 'Cylinder set was not found');
    });

    test('it fails with negative storageCylinder pressure', async () => {
      const PAYLOAD = {
        cylinderSetId: 'f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        gasMixture: 'neg pressure',
        filledAir: true,
        storageCylinderUsageArr: [
          {
            storageCylinderId: 1,
            startPressure: 8,
            endPressure: 10,
          },
        ],
        description: 'Tämä on ylimääräistä infoa',
        price: 30000,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.deepStrictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.deepStrictEqual(
        body.message,
        'Cannot have negative fill pressure',
      );
    });

    test('it fails when the request price is not right', async () => {
      const PAYLOAD = {
        cylinderSetId: 'f4e1035e-f36e-4056-9a1b-5925a3c5793e',
        filledAir: true,
        gasMixture: 'price=bad',
        storageCylinderUsageArr: [
          {
            storageCylinderId: 1,
            startPressure: 10,
            endPressure: 8,
          },
        ],
        description: 'Tämä on ylimääräistä infoa',
        price: 10,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.deepStrictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.deepStrictEqual(
        body.message,
        'Client price did not match server price',
      );
    });

    test('it fails if the user does not have blender privileges', async () => {
      const login = await server.inject({
        url: '/api/login',
        method: 'POST',
        payload: {
          email: 'oujeaasd@XD.fi',
          password: 'password',
        },
      });
      const tokens = JSON.parse(login.body);
      headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };
      const PAYLOAD = {
        cylinderSetId: 'b4e1035e-f36e-4056-9a1b-5925a3c57100',
        gasMixture: 'EAN32',
        filledAir: true,
        storageCylinderUsageArr: [
          {
            storageCylinderId: 1,
            startPressure: 10,
            endPressure: 8,
          },
        ],
        price: 30000,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.deepStrictEqual(res.statusCode, 403);
    });
  });
});
