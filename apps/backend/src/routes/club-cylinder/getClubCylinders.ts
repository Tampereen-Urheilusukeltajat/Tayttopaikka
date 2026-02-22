import { type FastifyInstance } from 'fastify';
import { getClubCylinderSets } from '../../lib/queries/divingCylinderSet';
import {
  type DivingCylinderSet,
  divingCylinderSet,
} from '../../types/divingCylinderSet.types';

const schema = {
  description: 'Gets all club diving cylinder sets',
  tags: ['Club cylinder'],
  response: {
    200: {
      type: 'array',
      items: divingCylinderSet,
    },
    401: { $ref: 'error' },
    403: { $ref: 'error' },
    500: { $ref: 'error' },
  },
};

const handler = async (): Promise<DivingCylinderSet[]> => {
  return getClubCylinderSets();
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/',
    preValidation: [fastify['authenticate'], fastify['instructor']],
    handler,
    schema,
  });
};
