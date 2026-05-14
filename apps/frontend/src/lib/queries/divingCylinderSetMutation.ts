import { useMutation } from '@tanstack/react-query';

import { type UseMutation } from './common';
import { toast } from 'react-toastify';
import { DIVING_CYLINDER_SETS_QUERY_KEY } from './queryKeys';
import {
  archiveDivingCylinderSet,
  patchDivingCylinderSet,
  postDivingCylinderSet,
  type PatchDivingCylinderSetPayload,
  type DivingCylinderSetPostRequest,
} from '../apiRequests/divingCylinderSetRequests';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';

export const useArchieveDivingCylinderSetMutation = (
  userId: string,
  onSuccess: () => void,
): UseMutation<string, string> => {
  const { mutate, isPending, isError, data } = useMutation({
    mutationKey: DIVING_CYLINDER_SETS_QUERY_KEY(userId),
    mutationFn: async (divingCylinderSetId: string) =>
      archiveDivingCylinderSet(divingCylinderSetId),
    onSuccess: () => {
      onSuccess?.();

      toast.success('Pullosetti poistettu näkyvistä.');
    },
    onError: () => {
      toast.error('Pullosetin poistaminen epäonnistui. Yritä uudelleen.');
    },
  });

  return {
    isPending,
    isError,
    data,
    mutate,
  };
};

type PatchDivingCylinderSet = {
  divingCylinderSetId: string;
  payload: PatchDivingCylinderSetPayload;
};

export const usePatchDivingCylinderSet = (
  userId: string,
  onSuccess: () => void,
): UseMutation<DivingCylinderSet, PatchDivingCylinderSet> => {
  const { mutate, isPending, isError, data } = useMutation({
    mutationKey: DIVING_CYLINDER_SETS_QUERY_KEY(userId),
    mutationFn: async ({
      divingCylinderSetId,
      payload,
    }: PatchDivingCylinderSet) =>
      patchDivingCylinderSet(divingCylinderSetId, payload),
    onSuccess: () => {
      onSuccess?.();

      toast.success('Pullosetin päivitys onnistui.');
    },
    onError: () => {
      toast.error('Pullosetin päivitys epäonnistui. Yritä uudelleen.');
    },
  });

  return {
    isPending,
    isError,
    data,
    mutate,
  };
};

export const useCreateDivingCylinderSet = (
  userId: string,
  onSuccess: () => void,
): UseMutation<DivingCylinderSet, DivingCylinderSetPostRequest> => {
  const { mutate, isPending, isError, data } = useMutation({
    mutationKey: DIVING_CYLINDER_SETS_QUERY_KEY(userId),
    mutationFn: async (payload: DivingCylinderSetPostRequest) =>
      postDivingCylinderSet(payload),
    onSuccess: () => {
      onSuccess?.();

      toast.success('Uusi pullosetti lisätty!');
    },
    onError: () => {
      toast.error(
        'Uuden pullosetin luominen epäonnistui. Tarkista tiedot ja yritä uudelleen.',
      );
    },
  });

  return {
    isPending,
    isError,
    data,
    mutate,
  };
};
