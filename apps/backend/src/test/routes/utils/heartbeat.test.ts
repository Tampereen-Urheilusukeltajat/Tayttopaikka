import { describe, test } from 'node:test';
import assert from 'node:assert';
import { type FastifyInstance } from 'fastify';
import { type HeartbeatResponse } from '../../../routes/utils/heartbeat';
import { buildServer } from '../../../server';

describe('heartbeat', () => {
  const getTestIntance = async (): Promise<FastifyInstance> =>
    buildServer({
      routePrefix: 'api',
    });

  test('it returns status OK and the current date', async () => {
    const server = await getTestIntance();

    const res = await server.inject({
      url: 'api/utils/heartbeat',
    });

    assert.strictEqual(res.statusCode, 200);

    const resBody = JSON.parse(res.body) as HeartbeatResponse;
    assert.ok('status' in resBody);
    assert.ok('date' in resBody);
    assert.strictEqual(resBody.status, 'OK');
  });
});
