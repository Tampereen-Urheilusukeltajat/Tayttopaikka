import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getGases, getAllGasPrices } from '../apiRequests/gasRequests';
import { type AvailableGasses } from '../utils';
import { type UseQuery } from './common';
import { GAS_QUERY, GAS_ALL_PRICES_QUERY } from './queryKeys';
import { useEffect } from 'react';

export type GasWithPricing = {
  activeFrom: string;
  activeTo?: string;
  gasId: number;
  gasName: AvailableGasses;
  gasPriceId: number;
  priceEurCents: number;
};

export const useGasesQuery = (): UseQuery<GasWithPricing[]> => {
  const { isLoading, data, isError } = useQuery({
    queryKey: GAS_QUERY,
    queryFn: async () => getGases(),

    retry: 1,
    staleTime: 1000 * 60 * 60, // One hour
  });

  useEffect(() => {
    if (isError) {
      toast.error('Kaasujen hakeminen epäonnistui. Yritä uudelleen.');
    }
  }, [isError]);

  return {
    data,
    isLoading,
    isError,
  };
};

export const useAllGasPricesQuery = (): UseQuery<GasWithPricing[]> => {
  const { isLoading, data, isError } = useQuery({
    queryKey: GAS_ALL_PRICES_QUERY,
    queryFn: async () => getAllGasPrices(),
    retry: 1,
  });

  useEffect(() => {
    if (isError) {
      toast.error('Hintojen hakeminen epäonnistui. Yritä uudelleen.');
    }
  }, [isError]);

  return { data, isLoading, isError };
};
