import { type PaymentEvent } from '../queries/invoicePaymentEventMutation';
import { authGetAsync } from './api';

export const getPaymentEvents = async (
  userId: string,
): Promise<PaymentEvent[]> => {
  const response = await authGetAsync<PaymentEvent[]>(
    `/api/payment-events/${userId}`,
  );
  return response.data;
};
