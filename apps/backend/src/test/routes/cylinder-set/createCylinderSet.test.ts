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
} from '../../../lib/utils/testUtils';
import { knexController } from '../../../database/database';
import { buildServer } from '../../../server';

describe('create cylinder set', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({
      routePrefix: 'api',
    });

  before(async () => {
    await createTestDatabase('create_cylinder_set');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await knexController.destroy();
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
        email: 'user@taursu.fi',
        password: 'salasana',
      },
    });
    const tokens = JSON.parse(res.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };
  });

  afterEach(async () => {
    await server.close();
  });

  test('it responds with 201 and proper body if creation was successful', async () => {
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottle',
      cylinders: [
        {
          volume: 0.5,
          pressure: 200,
          material: 'steel',
          serialNumber: '3540965436löj564',
          inspection: '2020-01-01',
        },
      ],
    };

    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 201);
    const responseBody = JSON.parse(res.body);

    // Extract only the fields we want to compare
    const { id, cylinders, ...restOfResponse } = responseBody;
    const { id: cylinderId, inspection, ...restOfCylinder } = cylinders[0];

    // Check inspection field exists and contains the expected date
    assert.ok(inspection);
    assert.ok(inspection.includes(payload.cylinders[0].inspection));

    // Compare without ids and inspection
    const normalizedResponse = {
      ...restOfResponse,
      cylinders: [restOfCylinder, ...cylinders.slice(1)],
    };

    const { inspection: _inspection, ...payloadCylinder } =
      payload.cylinders[0];
    const normalizedPayload = {
      ...payload,
      cylinders: [payloadCylinder, ...payload.cylinders.slice(1)],
    };

    assert.deepStrictEqual(normalizedResponse, normalizedPayload);
  });

  test('it responds with 201 and proper body if creation of multiple cylinder set was successful', async () => {
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottle0.1',
      cylinders: [
        {
          volume: 15,
          pressure: 200,
          material: 'steel',
          serialNumber: '3540965436löj564',
          inspection: '2020-01-01',
        },
        {
          volume: 15,
          pressure: 200,
          material: 'steel',
          serialNumber: 'ihanerokoodi',
          inspection: '2020-01-03',
        },
      ],
    };

    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 201);
    const responseBody = JSON.parse(res.body);

    assert.ok('id' in responseBody);
    assert.ok('id' in responseBody.cylinders[0]);
    assert.ok('id' in responseBody.cylinders[1]);

    assert.ok('inspection' in responseBody.cylinders[0]);
    assert.ok('inspection' in responseBody.cylinders[1]);

    for (const cylinder of responseBody.cylinders) {
      const expected =
        cylinder.serialNumber === '3540965436löj564'
          ? payload.cylinders[0]
          : payload.cylinders[1];
      assert.deepStrictEqual(cylinder.volume, expected.volume);
      assert.deepStrictEqual(cylinder.pressure, expected.pressure);
      assert.deepStrictEqual(cylinder.material, expected.material);
    }

    assert.deepStrictEqual(responseBody.owner, payload.owner);
    assert.deepStrictEqual(responseBody.name, payload.name);
    const tokens = JSON.parse(res.body);
    headers = { Authorization: 'Bearer ' + String(tokens.accessToken) };
  });

  test('it responds with 400 if one of those cylinder inspection date are in the future', async () => {
    const date = new Date();
    date.setUTCFullYear(date.getUTCFullYear() + 2);
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottle2',
      cylinders: [
        {
          volume: 15,
          pressure: 200,
          material: 'aluminium',
          serialNumber: '3540965436löj564',
          inspection: date.toISOString(),
        },
      ],
    };

    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 400);
    assert.strictEqual(
      JSON.parse(res.body).message,
      'Inspection date from the future',
    );
  });

  test('it responds with 400 if user does not exists', async () => {
    const payload = {
      owner: '3bd0b342-7ed6-11ed-8627-376b0bc3e6be', // not in user.csv
      name: 'bottle4',
      cylinders: [
        {
          volume: 15,
          pressure: 200,
          material: 'aluminium',
          serialNumber: '3540965436löj564',
          inspection: '2022-10-18T07:30:10.184Z',
        },
      ],
    };
    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 400);
    assert.strictEqual(JSON.parse(res.body).message, 'User not found');
  });

  test('it responds with 400 if some cylinder has invalid value for volume', async () => {
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottle5',
      cylinders: [
        {
          volume: -1,
          pressure: 200,
          material: 'aluminium',
          serialNumber: '3540965436löj564',
          inspection: '2022-10-18T07:30:10.184Z',
        },
      ],
    };
    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 400);
  });

  test('it responds with 400 if some cylinder has invalid value for pressure', async () => {
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottle6',
      cylinders: [
        {
          volume: 15,
          pressure: 0,
          material: 'aluminium',
          serialNumber: '3540965436löj564',
          inspection: '2022-10-18T07:30:10.184Z',
        },
      ],
    };
    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 400);
  });

  test('it responds with 400 if set does not have cylinders', async () => {
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottle7',
      cylinders: [],
    };
    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 400);
  });

  test('it responds with 400 if set name is too long', async () => {
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottle88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888',
      cylinders: [
        {
          volume: 15,
          pressure: 200,
          material: 'steel',
          serialNumber: '3540965436löj564',
          inspection: '2020-01-01',
        },
      ],
    };

    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 400);
  });

  test('it responds with 400 if owner id is not in uuid format', async () => {
    const payload = {
      owner: '123403984525',
      name: 'validBotleName',
      cylinders: [
        {
          volume: 15,
          pressure: 200,
          material: 'steel',
          serialNumber: '3540965436löj564',
          inspection: '2020-01-01',
        },
      ],
    };

    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      headers,
      payload,
    });

    assert.deepStrictEqual(res.statusCode, 400);

    const responseBody = JSON.parse(res.body);
    assert.deepStrictEqual(
      responseBody.message,
      'body/owner must match format "uuid"',
    );
  });

  test('it responds with 401 if request is unauthenticated', async () => {
    const payload = {
      owner: 'd57ff56c-7ed5-11ed-a20a-27a77b2da7d7',
      name: 'bottleagain',
      cylinders: [
        {
          volume: 15,
          pressure: 200,
          material: 'steel',
          serialNumber: '3540965436löj564',
          inspection: '2020-01-01',
        },
      ],
    };

    const res = await server.inject({
      url: 'api/cylinder-set',
      method: 'POST',
      payload,
      headers: { Authorization: 'Bearer definitely not valid jwt token' },
    });

    assert.deepStrictEqual(res.statusCode, 401);
    const responseBody = JSON.parse(res.body);

    assert.deepStrictEqual(responseBody, {
      statusCode: 401,
      error: 'Unauthorized',
    });
  });
});
