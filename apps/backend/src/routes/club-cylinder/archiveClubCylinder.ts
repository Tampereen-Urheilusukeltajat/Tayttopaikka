import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  type DivingCylinderSetIdParamsPayload,
  divingCylinderSetIdParamsPayload,
} from '../../types/divingCylinderSet.types';
import {
  archiveDivingCylinderSet,
  clubCylinderSetExists,
} from '../../lib/queries/divingCylinderSet';
import { errorHandler } from '../../lib/utils/errorHandler';

const archiveClubCylinderSetReply = Type.Object({
  divingCylinderSetId: Type.String({ format: 'uuid' }),
});

const schema = {
  description: 'Archives aka deletes a club diving cylinder set',
  tags: ['Club cylinder'],
  params: divingCylinderSetIdParamsPayload,
  response: {
    200: archiveClubCylinderSetReply,
    400: { $ref: 'error' },
    401: { $ref: 'error' },
    404: { $ref: 'error' },
    403: { $ref: 'error' },
    500: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest<{
    Params: DivingCylinderSetIdParamsPayload;
  }>,
  reply: FastifyReply,
): Promise<void> => {
  const { divingCylinderSetId } = request.params;

  const exists = await clubCylinderSetExists(divingCylinderSetId);
  if (!exists) return errorHandler(reply, 404);

  // Archive cylinder set
  await archiveDivingCylinderSet(divingCylinderSetId);

  return reply.send({
    divingCylinderSetId,
  });
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'PATCH',
    url: '/:divingCylinderSetId/archive',
    preValidation: [fastify['authenticate'], fastify['instructor']],
    handler,
    schema,
  });
};
