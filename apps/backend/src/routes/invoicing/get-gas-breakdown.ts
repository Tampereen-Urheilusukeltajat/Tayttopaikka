import {
  type FastifyRequest,
  type FastifyInstance,
  type FastifyReply,
} from 'fastify';
import { getPendingGasCostBreakdown } from '../../lib/queries/payment';
import { gasBreakdownRow } from '../../types/invoices.types';
import { Type } from '@sinclair/typebox';

const schema = {
  description: 'Get pending revenue grouped by gas type, across all users',
  tags: ['Invoices'],
  query: {},
  response: {
    200: Type.Array(gasBreakdownRow),
    400: { $ref: 'error' },
    401: { $ref: 'error' },
    403: { $ref: 'error' },
    409: { $ref: 'error' },
    500: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const gasBreakdown = await getPendingGasCostBreakdown();

  return reply.code(200).send(gasBreakdown);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/gas-breakdown',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
