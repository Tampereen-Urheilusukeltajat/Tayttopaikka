import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  createGasPrice,
  deleteGasPrice,
  type CreateGasPricePayload,
} from '../apiRequests/gasRequests';
import { type GasWithPricing } from './gasQuery';
import { type UseMutation } from './common';
import { GAS_QUERY, GAS_ALL_PRICES_QUERY } from './queryKeys';

export const useCreateGasPriceMutation = (
  onSuccess: () => void,
): UseMutation<GasWithPricing, CreateGasPricePayload> => {
  const queryClient = useQueryClient();
  const { isPending, mutate, data, isError } = useMutation({
    mutationFn: async (payload: CreateGasPricePayload) =>
      createGasPrice(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GAS_QUERY });
      await queryClient.invalidateQueries({ queryKey: GAS_ALL_PRICES_QUERY });
      toast.success('Kaasun hinta päivitetty.');
      onSuccess();
    },
    onError: () => {
      toast.error('Hinnan päivitys epäonnistui. Yritä uudelleen.');
    },
    retry: 0,
  });

  return { isPending, mutate, data, isError };
};

export const useDeleteGasPriceMutation = (
  onSuccess: () => void,
): UseMutation<void, string> => {
  const queryClient = useQueryClient();
  const { isPending, mutate, data, isError } = useMutation({
    mutationFn: async (gasPriceId: string) => deleteGasPrice(gasPriceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GAS_QUERY });
      await queryClient.invalidateQueries({ queryKey: GAS_ALL_PRICES_QUERY });
      toast.success('Tuleva hinta poistettu.');
      onSuccess();
    },
    onError: () => {
      toast.error('Hinnan poisto epäonnistui. Yritä uudelleen.');
    },
    retry: 0,
  });

  return { isPending, mutate, data, isError };
};
