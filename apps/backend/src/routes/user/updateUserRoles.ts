import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';

import {
  type UserIdParamsPayload,
  userResponse,
  userIdParamsPayload,
  updateUserRolesBody,
  type UpdateUserRolesBody,
} from '../../types/user.types';
import { getUserWithId, updateUsersRoles } from '../../lib/queries/user';
import { errorHandler } from '../../lib/utils/errorHandler';
import { sendUserStatusChangedEmail } from '../../lib/utils/accessRightsChangeEmails';
import { log } from '../../lib/utils/log';

const editUserSchema = {
  description: 'Update users roles',
  summary: 'Update users roles',
  tags: ['User'],
  params: userIdParamsPayload,
  body: updateUserRolesBody,
  response: {
    200: userResponse,
    400: { $ref: 'error' },
    403: { $ref: 'error' },
    404: { $ref: 'error' },
    409: { $ref: 'error' },
    500: { $ref: 'error' },
  },
};

const handler = async (
  req: FastifyRequest<{
    Body: UpdateUserRolesBody;
    Params: UserIdParamsPayload;
  }>,
  reply: FastifyReply,
): Promise<void> => {
  const { userId } = req.params;

  const user = await getUserWithId(userId, true);
  if (!user) {
    return errorHandler(reply, 404);
  }

  const updatedUser = await updateUsersRoles(userId, req.body);

  if (user.isUser !== updatedUser.isUser) {
    try {
      await sendUserStatusChangedEmail(updatedUser, updatedUser.isUser);
    } catch (error) {
      log.error(
        `Failed to send isUser status change notification to user ${updatedUser.id}`,
        error,
      );
    }
  }

  return reply.send(updatedUser);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'PATCH',
    url: '/:userId/roles',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema: editUserSchema,
  });
};
