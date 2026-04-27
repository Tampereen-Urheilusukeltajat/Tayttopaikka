/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { type preValidationHookHandler } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: preValidationHookHandler;
    admin: preValidationHookHandler;
    instructor: preValidationHookHandler;
  }
}
