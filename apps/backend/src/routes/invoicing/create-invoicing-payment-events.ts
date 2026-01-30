import {
  type FastifyRequest,
  type FastifyInstance,
  type FastifyReply,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { paymentEvent } from '../../types/payment.types';
import { type Invoice } from '../../types/invoices.types';
import { createInvoicePaymentEvents } from '../../lib/queries/invoice';
import { getPaymentEventsWithIds } from '../../lib/queries/payment';
import { minifiedUserResponse } from '../../types/user.types';

const invoiceRow = Type.Object({
  id: Type.Number(),
  date: Type.String(),
  description: Type.String(),
  gasMixture: Type.String(),
  price: Type.Number(),
});

const invoiceBodySchema = Type.Object({
  user: minifiedUserResponse,
  invoiceTotal: Type.Number({ minimum: 0 }),
  invoiceRows: Type.Array(invoiceRow),
});

const schema = {
  description: 'Create payment events for invoices',
  tags: ['Invoices'],
  body: Type.Array(invoiceBodySchema),
  response: {
    201: Type.Array(paymentEvent),
    400: { $ref: 'error' },
    401: { $ref: 'error' },
    403: { $ref: 'error' },
    409: { $ref: 'error' },
    500: { $ref: 'error' },
  },
};

const handler = async (
  request: FastifyRequest<{
    Body: Invoice[];
  }>,
  reply: FastifyReply,
): Promise<void> => {
  const createdByUserId = request.user.id;

  const paymentEventIds = await createInvoicePaymentEvents(
    request.body,
    createdByUserId,
  );

  const paymentEvents = await getPaymentEventsWithIds(paymentEventIds);

  return reply.code(201).send(paymentEvents);
};

export default async (fastify: FastifyInstance): Promise<void> => {
  fastify.route({
    method: 'POST',
    url: '/payment-events',
    preValidation: [fastify['authenticate'], fastify['admin']],
    handler,
    schema,
  });
};
