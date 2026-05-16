import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { type UseQuery } from './common';
import { PAYMENT_EVENTS_QUERY_KEY } from './queryKeys';
import { type PaymentEvent } from './invoicePaymentEventMutation';
import { getPaymentEvents } from '../apiRequests/paymentEventRequests';

export const usePaymentEventsQuery = (
  userId: string,
): UseQuery<PaymentEvent[]> => {
  const { isLoading, data, isError } = useQuery({
    queryKey: [...PAYMENT_EVENTS_QUERY_KEY, userId],
    queryFn: async () => getPaymentEvents(userId),
    retry: 1,
  });

  useEffect(() => {
    if (isError) {
      toast.error('Maksutapahtumien hakeminen epäonnistui. Yritä uudelleen.');
    }
  }, [isError]);

  return {
    data,
    isLoading,
    isError,
  };
};
