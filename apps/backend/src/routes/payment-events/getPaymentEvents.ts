import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { paymentEvent } from '../../types/payment.types';
import {
  userIdParamsPayload,
  type UserIdParamsPayload,
} from '../../types/user.types';
import { getPaymentEventsForUser } from '../../lib/queries/payment';
import { errorHandler } from '../../lib/utils/errorHandler';

const schema = {
  description: 'Get payment events for a user',
  tags: ['Payment events'],
  params: userIdParamsPayload,
  response: {
    200: Type.Array(paymentEvent),
    401: { $ref: 'error' },
    403: { $ref: 'error' },
  },
};

const handler = async (
  req: FastifyRequest<{
    Params: UserIdParamsPayload;
  }>,
  reply: FastifyReply,
): Promise<void> => {
  const { userId } = req.params;

  if (userId !== req.user.id && !req.user.isAdmin)
    return errorHandler(reply, 403);

  const paymentEvents = await getPaymentEventsForUser(userId);
  return reply.send(paymentEvents);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/:userId',
    preValidation: [fastify['authenticate']],
    handler,
    schema,
  });
};
