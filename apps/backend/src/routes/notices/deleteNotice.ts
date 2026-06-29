import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { errorHandler } from '../../lib/utils/errorHandler';
import { deleteNotice } from '../../lib/queries/siteNotice';

const schema = {
  description: 'Delete a site notice',
  tags: ['notices'],
  params: Type.Object({ id: Type.String() }),
  response: {
    204: Type.Null(),
    401: { $ref: 'error' },
    403: { $ref: 'error' },
    404: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> => {
  const deleted = await deleteNotice(request.params.id);
  if (!deleted) return errorHandler(reply, 404, 'Notice not found');
  return reply.code(204).send();
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'DELETE',
    url: '/:id',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
