import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { getNotices, getAdminNotices } from '../apiRequests/noticeRequests';
import { type SiteNotice, type SiteNoticeWithPoster } from '../../interfaces/SiteNotice';
import { type UseQuery } from './common';
import { NOTICES_QUERY_KEY, ADMIN_NOTICES_QUERY_KEY } from './queryKeys';

export const useNoticesQuery = (): UseQuery<SiteNotice[]> => {
  const { isLoading, data, isError } = useQuery({
    queryKey: NOTICES_QUERY_KEY,
    queryFn: getNotices,
    staleTime: 1000 * 60,
    retry: 1,
  });

  useEffect(() => {
    if (isError) {
      toast.error('Ilmoitusten hakeminen epäonnistui.');
    }
  }, [isError]);

  return { data, isLoading, isError };
};

export const useAdminNoticesQuery = (): UseQuery<SiteNoticeWithPoster[]> => {
  const { isLoading, data, isError } = useQuery({
    queryKey: ADMIN_NOTICES_QUERY_KEY,
    queryFn: getAdminNotices,
    retry: 1,
  });

  useEffect(() => {
    if (isError) {
      toast.error('Ilmoitusten hakeminen epäonnistui.');
    }
  }, [isError]);

  return { data, isLoading, isError };
};
