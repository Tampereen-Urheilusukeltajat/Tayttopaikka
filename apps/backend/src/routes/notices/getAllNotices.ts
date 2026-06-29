import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { siteNoticeWithPoster } from '../../types/siteNotice.types';
import { getAllNotices } from '../../lib/queries/siteNotice';

const schema = {
  description: 'Get all site notices (admin)',
  tags: ['notices'],
  response: {
    200: Type.Array(siteNoticeWithPoster),
    401: { $ref: 'error' },
    403: { $ref: 'error' },
  },
};

const handler = async (
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const notices = await getAllNotices();
  return reply.code(200).send(notices);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/admin',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
