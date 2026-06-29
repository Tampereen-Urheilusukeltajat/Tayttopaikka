import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { siteNotice } from '../../types/siteNotice.types';
import { getActiveNotices } from '../../lib/queries/siteNotice';

const schema = {
  description: 'Get active site notices',
  tags: ['notices'],
  response: {
    200: Type.Array(siteNotice),
    401: { $ref: 'error' },
  },
};

const handler = async (
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const notices = await getActiveNotices();
  return reply.code(200).send(notices);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/',
    preValidation: [fastify['authenticate']],
    handler,
    schema,
  });
};
