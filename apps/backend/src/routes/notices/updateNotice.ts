import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { errorHandler } from '../../lib/utils/errorHandler';
import {
  updateSiteNoticeBody,
  type UpdateSiteNoticeBody,
  siteNotice,
} from '../../types/siteNotice.types';
import { updateNotice } from '../../lib/queries/siteNotice';

const schema = {
  description: 'Update a site notice',
  tags: ['notices'],
  params: Type.Object({ id: Type.String() }),
  body: updateSiteNoticeBody,
  response: {
    200: siteNotice,
    401: { $ref: 'error' },
    403: { $ref: 'error' },
    404: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateSiteNoticeBody }>,
  reply: FastifyReply,
): Promise<void> => {
  const notice = await updateNotice(request.params.id, request.body);
  if (!notice) return errorHandler(reply, 404, 'Notice not found');
  return reply.code(200).send(notice);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'PATCH',
    url: '/:id',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
