import { Type, type Static } from '@sinclair/typebox';

export const createGas = Type.Object({
  name: Type.String({ maxLength: 128 }),
});

export type CreateGas = Static<typeof createGas>;

export const gas = Type.Intersect([
  Type.Object({ id: Type.String() }),
  createGas,
]);

export type Gas = Static<typeof gas>;

export const gasWithPricing = Type.Object({
  activeFrom: Type.String({ format: 'date-time' }),
  activeTo: Type.Optional(Type.String({ format: 'date-time' })),
  gasId: Type.Integer(),
  gasPriceId: Type.Integer(),
  gasName: Type.String(),
  priceEurCents: Type.Number({ minimum: 0 }),
});

export type GasWithPricing = Static<typeof gasWithPricing>;

export const createGasPriceBody = Type.Object({
  gasId: Type.String(),
  priceEurCents: Type.Number({ minimum: 0, multipleOf: 0.1 }),
  activeFrom: Type.String({ format: 'date-time' }),
});

export type CreateGasPriceBody = Static<typeof createGasPriceBody>;

export const gasPrice = Type.Intersect([
  Type.Object({ id: Type.String() }),
  createGasPriceBody,
]);

export type GasPrice = Static<typeof gasPrice>;

// Internal type used by getDiluentPrice query for DB storage
export type DiluentPriceResult = {
  pricePerLitreCents: number;
  heliumGasPriceId: number;
};
