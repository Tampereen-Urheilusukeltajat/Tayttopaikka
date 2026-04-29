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

export const diluentPriceQuery = Type.Object({
  storageCylinderId: Type.String(),
  oxygenPercentage: Type.Number({ minimum: 0, maximum: 100 }),
  heliumPercentage: Type.Number({ minimum: 0, maximum: 100 }),
});

export type DiluentPriceQuery = Static<typeof diluentPriceQuery>;

export const diluentPriceResponse = Type.Object({
  pricePerLitreCents: Type.Number({ minimum: 0 }),
});

export type DiluentPriceResponse = Static<typeof diluentPriceResponse>;

// Internal type returned by getDiluentPrice — includes audit IDs for DB storage
// but not exposed on the API.
export type DiluentPriceResult = DiluentPriceResponse & {
  oxygenGasPriceId: number;
  heliumGasPriceId: number;
};
