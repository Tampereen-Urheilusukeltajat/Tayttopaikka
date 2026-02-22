import { authPostAsync, authGetAsync, authPatchAsync } from './api';
import {
  type DivingCylinder,
  type DivingCylinderSet,
} from '../../interfaces/DivingCylinderSet';

export type ClubCylinderSetPostRequest = {
  name: string;
  cylinders: Array<Omit<DivingCylinder, 'id'>>;
};

export type PatchClubCylinderSetPayload = {
  name?: string;
  cylinders?: Array<Partial<DivingCylinder> & { id: string }>;
};

export const postClubCylinderSet = async (
  payload: ClubCylinderSetPostRequest,
): Promise<DivingCylinderSet> => {
  const response = await authPostAsync<
    DivingCylinderSet,
    ClubCylinderSetPostRequest
  >('/api/club-cylinder/', payload);
  return response.data;
};

export const getClubCylinderSets = async (): Promise<DivingCylinderSet[]> => {
  const response = await authGetAsync<DivingCylinderSet[]>(
    '/api/club-cylinder/',
  );

  return response.data;
};

export const archiveClubCylinderSet = async (
  divingCylinderSetId: string,
): Promise<string> => {
  const res = await authPatchAsync<string, undefined>(
    `/api/club-cylinder/${divingCylinderSetId}/archive`,
  );
  return res.data;
};

export const patchClubCylinderSet = async (
  divingCylinderSetId: string,
  payload: PatchClubCylinderSetPayload,
): Promise<DivingCylinderSet> => {
  const res = await authPatchAsync<
    DivingCylinderSet,
    PatchClubCylinderSetPayload
  >(`/api/club-cylinder/${divingCylinderSetId}`, payload);

  return res.data;
};
