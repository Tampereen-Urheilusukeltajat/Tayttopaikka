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
import { type SiteNotice, type SiteNoticeWithPoster } from '../../../types/siteNotice.types';

const VALID_PAYLOAD = {
  message: 'Kompressori A ei toimi.',
  showLogbook: true,
  showBlenderLogbook: false,
  activeFrom: '2020-01-01T00:00:00.000Z',
  activeTo: null,
};

const getAdminHeaders = async (server: FastifyInstance): Promise<{ Authorization: string }> => {
  const res = await server.inject({
    url: '/api/login',
    method: 'POST',
    payload: { email: 'test-admin@email.fi', password: 'password' },
  });
  return { Authorization: 'Bearer ' + String(JSON.parse(res.body).accessToken) };
};

const getUserHeaders = async (server: FastifyInstance): Promise<{ Authorization: string }> => {
  const res = await server.inject({
    url: '/api/login',
    method: 'POST',
    payload: { email: 'test@email.fi', password: 'password' },
  });
  return { Authorization: 'Bearer ' + String(JSON.parse(res.body).accessToken) };
};

describe('Site notices', () => {
  const getTestInstance = async (): Promise<FastifyInstance> =>
    buildServer({ knex: getTestKnex(), routePrefix: 'api' });

  before(async () => {
    await createTestDatabase('notices');
    await startRedisConnection();
  });

  after(async () => {
    await dropTestDatabase();
    await stopRedisConnection();
  });

  let server: FastifyInstance;
  let adminHeaders: { Authorization: string };
  let userHeaders: { Authorization: string };

  beforeEach(async () => {
    server = await getTestInstance();
    [adminHeaders, userHeaders] = await Promise.all([
      getAdminHeaders(server),
      getUserHeaders(server),
    ]);
  });

  afterEach(async () => {
    await getTestKnex()('site_notice').del();
    await server.close();
  });

  describe('POST /api/notices', () => {
    test('201 — admin creates a notice', async () => {
      const res = await server.inject({
        headers: adminHeaders,
        method: 'POST',
        url: '/api/notices',
        payload: VALID_PAYLOAD,
      });

      assert.strictEqual(res.statusCode, 201);
      const body: SiteNotice = JSON.parse(res.body);
      assert.strictEqual(body.message, VALID_PAYLOAD.message);
      assert.strictEqual(body.showLogbook, true);
      assert.strictEqual(body.showBlenderLogbook, false);
      assert.strictEqual(body.activeTo, null);

      const [row] = await getTestKnex()('site_notice').where('id', body.id);
      assert.ok(row);
      assert.strictEqual(row.message, VALID_PAYLOAD.message);
    });

    test('400 — no view target selected', async () => {
      const res = await server.inject({
        headers: adminHeaders,
        method: 'POST',
        url: '/api/notices',
        payload: { ...VALID_PAYLOAD, showLogbook: false, showBlenderLogbook: false },
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(
        JSON.parse(res.body).message,
        'At least one view target must be selected',
      );
    });

    test('400 — missing message', async () => {
      const res = await server.inject({
        headers: adminHeaders,
        method: 'POST',
        url: '/api/notices',
        payload: { showLogbook: true, showBlenderLogbook: false, activeFrom: '2020-01-01T00:00:00Z', activeTo: null },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    test('401 — unauthenticated', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/notices',
        payload: VALID_PAYLOAD,
      });

      assert.strictEqual(res.statusCode, 401);
    });

    test('403 — non-admin', async () => {
      const res = await server.inject({
        headers: userHeaders,
        method: 'POST',
        url: '/api/notices',
        payload: VALID_PAYLOAD,
      });

      assert.strictEqual(res.statusCode, 403);
    });
  });

  describe('GET /api/notices', () => {
    test('200 — returns active notices only', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
      const future = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
      const expiredTo = new Date(now.getTime() - 1).toISOString();

      // active: from past, no end
      await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: { ...VALID_PAYLOAD, message: 'Active', activeFrom: past, activeTo: null },
      });
      // future: from future
      await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: { ...VALID_PAYLOAD, message: 'Future', activeFrom: future, activeTo: null },
      });
      // expired: from past, ended in past
      await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: { ...VALID_PAYLOAD, message: 'Expired', activeFrom: past, activeTo: expiredTo },
      });

      const res = await server.inject({
        headers: userHeaders,
        method: 'GET',
        url: '/api/notices',
      });

      assert.strictEqual(res.statusCode, 200);
      const body: SiteNotice[] = JSON.parse(res.body);
      assert.strictEqual(body.length, 1);
      assert.strictEqual(body[0].message, 'Active');
    });

    test('200 — returns empty array when no active notices', async () => {
      const res = await server.inject({
        headers: userHeaders,
        method: 'GET',
        url: '/api/notices',
      });

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(JSON.parse(res.body), []);
    });

    test('401 — unauthenticated', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/notices',
      });

      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('GET /api/notices/admin', () => {
    test('200 — returns all notices with poster name', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
      const expiredTo = new Date(now.getTime() - 1).toISOString();

      await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: { ...VALID_PAYLOAD, message: 'Active', activeFrom: past, activeTo: null },
      });
      await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: { ...VALID_PAYLOAD, message: 'Expired', activeFrom: past, activeTo: expiredTo },
      });

      const res = await server.inject({
        headers: adminHeaders,
        method: 'GET',
        url: '/api/notices/admin',
      });

      assert.strictEqual(res.statusCode, 200);
      const body: SiteNoticeWithPoster[] = JSON.parse(res.body);
      assert.strictEqual(body.length, 2);
      assert.ok(body[0].posterName);
      assert.strictEqual(typeof body[0].posterName, 'string');
    });

    test('401 — unauthenticated', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/notices/admin' });
      assert.strictEqual(res.statusCode, 401);
    });

    test('403 — non-admin', async () => {
      const res = await server.inject({
        headers: userHeaders,
        method: 'GET',
        url: '/api/notices/admin',
      });
      assert.strictEqual(res.statusCode, 403);
    });
  });

  describe('PATCH /api/notices/:id', () => {
    test('200 — admin updates notice message', async () => {
      const createRes = await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: VALID_PAYLOAD,
      });
      const created: SiteNotice = JSON.parse(createRes.body);

      const res = await server.inject({
        headers: adminHeaders,
        method: 'PATCH',
        url: `/api/notices/${String(created.id)}`,
        payload: { message: 'Päivitetty viesti' },
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(JSON.parse(res.body).message, 'Päivitetty viesti');
    });

    test('200 — admin deactivates notice by setting activeTo', async () => {
      const createRes = await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: { ...VALID_PAYLOAD, activeFrom: new Date(Date.now() - 60000).toISOString() },
      });
      const created: SiteNotice = JSON.parse(createRes.body);

      const expiredTo = new Date(Date.now() - 1).toISOString();
      const patchRes = await server.inject({
        headers: adminHeaders,
        method: 'PATCH',
        url: `/api/notices/${String(created.id)}`,
        payload: { activeTo: expiredTo },
      });
      assert.strictEqual(patchRes.statusCode, 200);

      const getRes = await server.inject({
        headers: userHeaders,
        method: 'GET',
        url: '/api/notices',
      });
      const active: SiteNotice[] = JSON.parse(getRes.body);
      assert.strictEqual(active.length, 0);
    });

    test('404 — notice does not exist', async () => {
      const res = await server.inject({
        headers: adminHeaders,
        method: 'PATCH',
        url: '/api/notices/99999',
        payload: { message: 'Ei löydy' },
      });
      assert.strictEqual(res.statusCode, 404);
    });

    test('401 — unauthenticated', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: '/api/notices/1',
        payload: { message: 'x' },
      });
      assert.strictEqual(res.statusCode, 401);
    });

    test('403 — non-admin', async () => {
      const createRes = await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: VALID_PAYLOAD,
      });
      const created: SiteNotice = JSON.parse(createRes.body);

      const res = await server.inject({
        headers: userHeaders,
        method: 'PATCH',
        url: `/api/notices/${String(created.id)}`,
        payload: { message: 'hax' },
      });
      assert.strictEqual(res.statusCode, 403);
    });
  });

  describe('DELETE /api/notices/:id', () => {
    test('204 — admin deletes notice', async () => {
      const createRes = await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: VALID_PAYLOAD,
      });
      const created: SiteNotice = JSON.parse(createRes.body);

      const res = await server.inject({
        headers: adminHeaders,
        method: 'DELETE',
        url: `/api/notices/${String(created.id)}`,
      });

      assert.strictEqual(res.statusCode, 204);
      const rows = await getTestKnex()('site_notice').where('id', created.id);
      assert.strictEqual(rows.length, 0);
    });

    test('404 — notice does not exist', async () => {
      const res = await server.inject({
        headers: adminHeaders,
        method: 'DELETE',
        url: '/api/notices/99999',
      });
      assert.strictEqual(res.statusCode, 404);
    });

    test('401 — unauthenticated', async () => {
      const res = await server.inject({ method: 'DELETE', url: '/api/notices/1' });
      assert.strictEqual(res.statusCode, 401);
    });

    test('403 — non-admin', async () => {
      const createRes = await server.inject({
        headers: adminHeaders, method: 'POST', url: '/api/notices',
        payload: VALID_PAYLOAD,
      });
      const created: SiteNotice = JSON.parse(createRes.body);

      const res = await server.inject({
        headers: userHeaders,
        method: 'DELETE',
        url: `/api/notices/${String(created.id)}`,
      });
      assert.strictEqual(res.statusCode, 403);
    });
  });
});
