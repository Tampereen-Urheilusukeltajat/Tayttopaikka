import {
  type SiteNotice,
  type SiteNoticeWithPoster,
  type CreateSiteNoticePayload,
  type UpdateSiteNoticePayload,
} from '../../interfaces/SiteNotice';
import {
  authGetAsync,
  authPostAsync,
  authPatchAsync,
  authDeleteAsync,
} from './api';

export const getNotices = async (): Promise<SiteNotice[]> => {
  const response = await authGetAsync<SiteNotice[]>('/api/notices');
  return response.data;
};

export const getAdminNotices = async (): Promise<SiteNoticeWithPoster[]> => {
  const response =
    await authGetAsync<SiteNoticeWithPoster[]>('/api/notices/admin');
  return response.data;
};

export const createNotice = async (
  payload: CreateSiteNoticePayload,
): Promise<SiteNotice> => {
  const response = await authPostAsync<SiteNotice, CreateSiteNoticePayload>(
    '/api/notices',
    payload,
  );
  return response.data;
};

export const updateNotice = async (
  id: number,
  payload: UpdateSiteNoticePayload,
): Promise<SiteNotice> => {
  const response = await authPatchAsync<SiteNotice, UpdateSiteNoticePayload>(
    `/api/notices/${String(id)}`,
    payload,
  );
  return response.data;
};

export const deleteNotice = async (id: number): Promise<void> => {
  await authDeleteAsync(`/api/notices/${String(id)}`);
};
