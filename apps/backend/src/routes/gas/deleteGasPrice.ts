import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { errorHandler } from '../../lib/utils/errorHandler';
import { deleteFutureGasPrice, getGasWithPricingWithPriceId } from '../../lib/queries/gas';

const schema = {
  description: 'Delete a future gas price',
  tags: ['gas price'],
  params: Type.Object({ gasPriceId: Type.String() }),
  response: {
    204: Type.Null(),
    400: { $ref: 'error' },
    401: { $ref: 'error' },
    403: { $ref: 'error' },
    404: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest<{ Params: { gasPriceId: string } }>,
  reply: FastifyReply,
): Promise<void> => {
  const { gasPriceId } = request.params;
  const price = await getGasWithPricingWithPriceId(gasPriceId);
  if (!price) return errorHandler(reply, 404, 'Gas price not found');

  if (new Date(price.activeFrom) <= new Date()) {
    return errorHandler(reply, 400, 'Cannot delete a price that is already active');
  }

  await deleteFutureGasPrice(gasPriceId);

  return reply.code(204).send();
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'DELETE',
    url: '/price/:gasPriceId',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
