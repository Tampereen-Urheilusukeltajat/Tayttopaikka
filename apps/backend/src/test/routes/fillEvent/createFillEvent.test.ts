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
        // sc1: Helium 50L, ceil(10-8)=2 bars, 2*50*300 = 30000 cents
        // sc5: Oxygen 50L, ceil(13.5-10.2)=4 bars, 4*50*150 = 30000 cents
        price: 60000,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      const resBody = JSON.parse(res.body);

      // TODO Create more complex test
      const expectedPrice = 60000;
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

  describe('diluent fills', () => {
    // sc11: Diluent, 50L volume (gas_id=5)
    // Helium 300 cents/L, Oxygen 150 cents/L
    const DILUENT_SC_ID = 11;
    const CYLINDER_SET_ID = 'b4e1035e-f36e-4056-9a1b-5925a3c5793e';

    afterEach(async () => {
      await getTestKnex()('fill_event_diluent_fill').del();
      await getTestKnex()('fill_event_gas_fill').del();
      await getTestKnex()('fill_event').del();
    });

    test('creates a fill event with a diluent cylinder', async () => {
      // 20% O2, 40% He, start=10, end=8
      // vol = ceil(10-8) * 50 = 100L
      // price = (0.20*150 + 0.40*300) * 100 = 15000 cents
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'TMX 20/40',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: DILUENT_SC_ID,
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 20,
            heliumPercentage: 40,
          },
        ],
        price: 15000,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.price, 15000);

      const diluentFills = await getTestKnex()('fill_event_diluent_fill')
        .where('fill_event_id', body.id)
        .select();
      assert.strictEqual(diluentFills.length, 1);
      assert.strictEqual(diluentFills[0].storage_cylinder_id, DILUENT_SC_ID);
      assert.strictEqual(diluentFills[0].oxygen_percentage, 20);
      assert.strictEqual(diluentFills[0].helium_percentage, 40);
      assert.strictEqual(diluentFills[0].price_eur_cents, 15000);
    });

    test('fails when using a non-diluent cylinder in diluentCylinderUsageArr', async () => {
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'TMX',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: 1, // Helium cylinder, not Diluent
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 20,
            heliumPercentage: 40,
          },
        ],
        price: 15000,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.strictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.message, 'Storage cylinder is not a diluent cylinder');
    });

    test('fails with negative fill pressure in diluentCylinderUsageArr', async () => {
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'TMX',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: DILUENT_SC_ID,
            startPressure: 8,
            endPressure: 10,
            oxygenPercentage: 20,
            heliumPercentage: 40,
          },
        ],
        price: 0,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.strictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.message, 'Cannot have negative fill pressure');
    });

    test('fails when oxygen + helium percentages exceed 100', async () => {
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'TMX',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: DILUENT_SC_ID,
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 60,
            heliumPercentage: 60,
          },
        ],
        price: 0,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.strictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(
        body.message,
        'Oxygen and helium percentages must not exceed 100',
      );
    });

    test('creates a fill event with 100% oxygen and 0% helium', async () => {
      // vol = ceil(10-8) * 50 = 100L, price = 1.0*150 * 100 = 15000 cents
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'Oxygen 100%',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: DILUENT_SC_ID,
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 100,
            heliumPercentage: 0,
          },
        ],
        price: 15000,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(JSON.parse(res.body).price, 15000);
    });

    test('creates a fill event with 0% oxygen and 100% helium', async () => {
      // vol = ceil(10-8) * 50 = 100L, price = 1.0*300 * 100 = 30000 cents
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'Helium 100%',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: DILUENT_SC_ID,
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 0,
            heliumPercentage: 100,
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
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(JSON.parse(res.body).price, 30000);
    });

    test('creates a fill event with 0% oxygen and 50% helium', async () => {
      // vol = ceil(10-8) * 50 = 100L, price = 0.5*300 * 100 = 15000 cents
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'Helium 50%',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: DILUENT_SC_ID,
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 0,
            heliumPercentage: 50,
          },
        ],
        price: 15000,
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(JSON.parse(res.body).price, 15000);
    });

    test('fails when client-submitted price does not match server-calculated price', async () => {
      const PAYLOAD = {
        cylinderSetId: CYLINDER_SET_ID,
        gasMixture: 'TMX',
        filledAir: false,
        storageCylinderUsageArr: [],
        diluentCylinderUsageArr: [
          {
            storageCylinderId: DILUENT_SC_ID,
            startPressure: 10,
            endPressure: 8,
            oxygenPercentage: 20,
            heliumPercentage: 40,
          },
        ],
        price: 1, // wrong total
      };
      const res = await server.inject({
        url: 'api/fill-event',
        method: 'POST',
        body: PAYLOAD,
        headers,
      });
      assert.strictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.message, 'Client price did not match server price');
    });
  });
});

