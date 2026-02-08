import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { unarchiveUser } from '../../lib/queries/userCleanup';

const params = Type.Object({
  userId: Type.String({ format: 'uuid' }),
});
type Params = Static<typeof params>;

const schema = {
  description: 'Unarchive a user and restore their cylinder sets',
  summary: 'Unarchive user',
  tags: ['Archived Users'],
  params,
  response: {
    200: Type.Object({
      message: Type.String(),
    }),
    400: { $ref: 'error' },
    401: { $ref: 'error' },
    403: { $ref: 'error' },
    404: { $ref: 'error' },
  },
};

const handler = async (
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> => {
  const { userId } = req.params;
  const adminUserId = req.user.id;

  try {
    await unarchiveUser(userId, adminUserId);

    return reply.send({
      message: 'User successfully unarchived',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send({
        message: error.message,
      });
    }

    throw error;
  }
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'POST',
    url: '/:userId/unarchive',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
