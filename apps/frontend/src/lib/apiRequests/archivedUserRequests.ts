import { type ArchivedUser } from '../../interfaces/ArchivedUser';
import { authGetAsync, authPostAsync } from './api';

export const getArchivedUsers = async (): Promise<ArchivedUser[]> => {
  const response = await authGetAsync<ArchivedUser[]>('/api/archived-users');

  return response.data;
};

export const unarchiveUser = async (userId: string): Promise<void> => {
  await authPostAsync<{ message: string }, undefined>(
    `/api/archived-users/${userId}/unarchive`,
    undefined,
  );
};
