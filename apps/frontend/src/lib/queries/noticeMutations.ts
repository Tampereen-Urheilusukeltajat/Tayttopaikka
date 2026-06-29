import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  createNotice,
  updateNotice,
  deleteNotice,
} from '../apiRequests/noticeRequests';
import {
  type SiteNotice,
  type CreateSiteNoticePayload,
  type UpdateSiteNoticePayload,
} from '../../interfaces/SiteNotice';
import { NOTICES_QUERY_KEY, ADMIN_NOTICES_QUERY_KEY } from './queryKeys';

const invalidateNotices = async (
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: NOTICES_QUERY_KEY });
  await queryClient.invalidateQueries({ queryKey: ADMIN_NOTICES_QUERY_KEY });
};

export const useCreateNoticeMutation = (onSuccess: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSiteNoticePayload) => createNotice(payload),
    onSuccess: async () => {
      await invalidateNotices(queryClient);
      toast.success('Ilmoitus luotu.');
      onSuccess();
    },
    onError: () => {
      toast.error('Ilmoituksen luonti epäonnistui. Yritä uudelleen.');
    },
    retry: 0,
  });
};

export const useUpdateNoticeMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateSiteNoticePayload;
    }): Promise<SiteNotice> => updateNotice(id, payload),
    onSuccess: async () => {
      await invalidateNotices(queryClient);
      toast.success('Ilmoitus päivitetty.');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Ilmoituksen päivitys epäonnistui. Yritä uudelleen.');
    },
    retry: 0,
  });
};

export const useDeleteNoticeMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNotice(id),
    onSuccess: async () => {
      await invalidateNotices(queryClient);
      toast.success('Ilmoitus poistettu.');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Ilmoituksen poisto epäonnistui. Yritä uudelleen.');
    },
    retry: 0,
  });
};
