import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { getArchivedUsersWithDetails } from '../../lib/queries/userCleanup';

const archivedUserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.Union([Type.String(), Type.Null()]),
  forename: Type.Union([Type.String(), Type.Null()]),
  surname: Type.Union([Type.String(), Type.Null()]),
  lastLogin: Type.String({ format: 'date-time' }),
  archivedAt: Type.String({ format: 'date-time' }),
  monthsInactive: Type.Number(),
  unpaidInvoicesCount: Type.Number(),
});

const schema = {
  description: 'Fetch all archived users (not yet anonymized)',
  summary: 'Fetch archived users',
  tags: ['Archived Users'],
  response: {
    200: Type.Array(archivedUserResponse),
    401: { $ref: 'error' },
    403: { $ref: 'error' },
  },
};

const handler = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const archivedUsers = await getArchivedUsersWithDetails();

  return reply.send(archivedUsers);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
