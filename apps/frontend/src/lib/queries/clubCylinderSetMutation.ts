import { useMutation } from '@tanstack/react-query';

import { type UseMutation } from './common';
import { toast } from 'react-toastify';
import { CLUB_CYLINDER_SETS_QUERY_KEY } from './queryKeys';
import {
  archiveClubCylinderSet,
  patchClubCylinderSet,
  postClubCylinderSet,
  type PatchClubCylinderSetPayload,
  type ClubCylinderSetPostRequest,
} from '../apiRequests/clubCylinderSetRequests';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';

export const useArchiveClubCylinderSetMutation = (
  onSuccess: () => void,
): UseMutation<string, string> => {
  const { mutate, isPending, isError, data } = useMutation({
    mutationKey: CLUB_CYLINDER_SETS_QUERY_KEY,
    mutationFn: async (divingCylinderSetId: string) =>
      archiveClubCylinderSet(divingCylinderSetId),
    onSuccess: () => {
      onSuccess?.();

      toast.success('Seuran pullosetti poistettu näkyvistä.');
    },
    onError: () => {
      toast.error(
        'Seuran pullosetin poistaminen epäonnistui. Yritä uudelleen.',
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

type PatchClubCylinderSet = {
  divingCylinderSetId: string;
  payload: PatchClubCylinderSetPayload;
};

export const usePatchClubCylinderSet = (
  onSuccess: () => void,
): UseMutation<DivingCylinderSet, PatchClubCylinderSet> => {
  const { mutate, isPending, isError, data } = useMutation({
    mutationKey: CLUB_CYLINDER_SETS_QUERY_KEY,
    mutationFn: async ({
      divingCylinderSetId,
      payload,
    }: PatchClubCylinderSet) =>
      patchClubCylinderSet(divingCylinderSetId, payload),
    onSuccess: () => {
      onSuccess?.();

      toast.success('Seuran pullosetin päivitys onnistui.');
    },
    onError: () => {
      toast.error('Seuran pullosetin päivitys epäonnistui. Yritä uudelleen.');
    },
  });

  return {
    isPending,
    isError,
    data,
    mutate,
  };
};

export const useCreateClubCylinderSet = (
  onSuccess: () => void,
): UseMutation<DivingCylinderSet, ClubCylinderSetPostRequest> => {
  const { mutate, isPending, isError, data } = useMutation({
    mutationKey: CLUB_CYLINDER_SETS_QUERY_KEY,
    mutationFn: async (payload: ClubCylinderSetPostRequest) =>
      postClubCylinderSet(payload),
    onSuccess: () => {
      onSuccess?.();

      toast.success('Seuran pullosetti luotu onnistuneesti.');
    },
    onError: () => {
      toast.error('Seuran pullosetin luominen epäonnistui. Yritä uudelleen.');
    },
  });

  return {
    isPending,
    isError,
    data,
    mutate,
  };
};
