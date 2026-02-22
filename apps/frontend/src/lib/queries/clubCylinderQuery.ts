import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getClubCylinderSets } from '../apiRequests/clubCylinderSetRequests';
import { type DivingCylinderSet } from '../../interfaces/DivingCylinderSet';
import { type UseQuery } from './common';
import { CLUB_CYLINDER_SETS_QUERY_KEY } from './queryKeys';
import { useEffect } from 'react';

export const useClubCylinderQuery = (): UseQuery<DivingCylinderSet[]> => {
  const { isLoading, data, isError } = useQuery({
    queryKey: CLUB_CYLINDER_SETS_QUERY_KEY,
    queryFn: async () => getClubCylinderSets(),
    retry: 1,
    staleTime: 1000 * 60 * 60, // One hour
  });

  useEffect(() => {
    if (isError) {
      toast.error('Seuran pullojen hakeminen epäonnistui. Yritä uudelleen.');
    }
  }, [isError]);

  return {
    data,
    isLoading,
    isError,
  };
};
