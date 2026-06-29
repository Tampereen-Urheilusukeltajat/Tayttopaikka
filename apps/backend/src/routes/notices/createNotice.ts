import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { errorHandler } from '../../lib/utils/errorHandler';
import {
  createSiteNoticeBody,
  type CreateSiteNoticeBody,
  siteNotice,
} from '../../types/siteNotice.types';
import { createNotice } from '../../lib/queries/siteNotice';

const schema = {
  description: 'Create a site notice',
  tags: ['notices'],
  body: createSiteNoticeBody,
  response: {
    201: siteNotice,
    400: { $ref: 'error' },
    401: { $ref: 'error' },
    403: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest<{ Body: CreateSiteNoticeBody }>,
  reply: FastifyReply,
): Promise<void> => {
  if (!request.body.showLogbook && !request.body.showBlenderLogbook) {
    return errorHandler(reply, 400, 'At least one view target must be selected');
  }

  const notice = await createNotice(request.body, request.user.id);
  return reply.code(201).send(notice);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'POST',
    url: '/',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
