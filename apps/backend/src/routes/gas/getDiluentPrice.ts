import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { errorHandler } from '../../lib/utils/errorHandler';
import { getDiluentPrice } from '../../lib/queries/gas';
import {
  diluentPriceQuery,
  diluentPriceResponse,
  type DiluentPriceQuery,
} from '../../types/gas.types';

const schema = {
  description:
    'Calculate diluent fill price per litre based on O2/He composition. ' +
    'Returns the price and the gas price IDs used, which must be submitted ' +
    'with the fill event for server-side price verification.',
  tags: ['gas price'],
  querystring: diluentPriceQuery,
  response: {
    200: diluentPriceResponse,
    400: { $ref: 'error' },
    401: { $ref: 'error' },
    403: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest<{ Querystring: DiluentPriceQuery }>,
  reply: FastifyReply,
): Promise<void> => {
  const { storageCylinderId, oxygenPercentage, heliumPercentage } =
    request.query;

  if (oxygenPercentage + heliumPercentage > 100) {
    return errorHandler(
      reply,
      400,
      'Oxygen and helium percentages must not exceed 100',
    );
  }

  try {
    const result = await getDiluentPrice(
      storageCylinderId,
      oxygenPercentage,
      heliumPercentage,
    );
    return reply.code(200).send(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Storage cylinder not found')
        return errorHandler(reply, 400, err.message);
      if (err.message === 'Storage cylinder is not a diluent cylinder')
        return errorHandler(reply, 400, err.message);
      if (err.message === 'No active price found for Oxygen')
        return errorHandler(reply, 400, err.message);
      if (err.message === 'No active price found for Helium')
        return errorHandler(reply, 400, err.message);
    }
    throw err;
  }
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/diluent-price',
    preValidation: [fastify['authenticate']],
    handler,
    schema,
  });
};
