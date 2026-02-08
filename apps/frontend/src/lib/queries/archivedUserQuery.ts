import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getArchivedUsers,
  unarchiveUser,
} from '../apiRequests/archivedUserRequests';
import { type ArchivedUser } from '../../interfaces/ArchivedUser';
import { type UseQuery, type UseMutation } from './common';
import { ARCHIVED_USERS_QUERY_KEY } from './queryKeys';
import { useEffect } from 'react';

export const useArchivedUsersQuery = (): UseQuery<ArchivedUser[]> => {
  const { isLoading, data, isError } = useQuery({
    queryKey: ARCHIVED_USERS_QUERY_KEY,
    queryFn: async () => getArchivedUsers(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  useEffect(() => {
    if (isError) {
      toast.error('Arkistoitujen käyttäjien hakeminen epäonnistui.');
    }
  }, [isError]);

  return {
    data,
    isLoading,
    isError,
  };
};

export const useUnarchiveUserMutation = (): UseMutation<void, string> => {
  const queryClient = useQueryClient();
  const { isPending, mutate, data, isError } = useMutation({
    mutationFn: async (userId: string) => unarchiveUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ARCHIVED_USERS_QUERY_KEY,
      });
      toast.success('Käyttäjä palautettu onnistuneesti');
    },
    onError: () => {
      toast.error('Käyttäjän palauttaminen epäonnistui. Yritä uudelleen.');
    },
    retry: 0,
  });

  return {
    isError,
    isPending,
    data,
    mutate,
  };
};
