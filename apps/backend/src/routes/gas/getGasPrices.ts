import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { gasWithPricing } from '../../types/gas.types';
import { Type } from '@sinclair/typebox';
import { getAllGasPrices } from '../../lib/queries/gas';

const schema = {
  description: 'Get all gas prices (current, past and future)',
  tags: ['gas price'],
  response: {
    200: Type.Array(gasWithPricing),
    401: { $ref: 'error' },
    403: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const prices = await getAllGasPrices();

  return reply.code(200).send(prices);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/prices',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
