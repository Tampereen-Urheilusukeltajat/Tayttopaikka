import { type GasWithPricing } from '../queries/gasQuery';
import { authGetAsync, authPostAsync, authDeleteAsync } from './api';

export type CreateGasPricePayload = {
  gasId: number;
  priceEurCents: number;
  activeFrom: string;
};

export const getGases = async (): Promise<GasWithPricing[]> => {
  const response = await authGetAsync<GasWithPricing[]>('/api/gas');

  return response.data;
};

export const getAllGasPrices = async (): Promise<GasWithPricing[]> => {
  const response = await authGetAsync<GasWithPricing[]>('/api/gas/prices');

  return response.data;
};

export const deleteGasPrice = async (gasPriceId: string): Promise<void> => {
  await authDeleteAsync(`/api/gas/price/${gasPriceId}`);
};

export const createGasPrice = async (
  payload: CreateGasPricePayload,
): Promise<GasWithPricing> => {
  const response = await authPostAsync<GasWithPricing, CreateGasPricePayload>(
    '/api/gas/price',
    payload,
  );

  return response.data;
};
