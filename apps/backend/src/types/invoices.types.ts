import { type Static, Type } from '@sinclair/typebox';
import { minifiedUserResponse } from './user.types';

const invoiceRow = Type.Object({
  id: Type.Number(),
  date: Type.String(),
  description: Type.String(),
  gasMixture: Type.String(),
  price: Type.Number(),
});

export type InvoiceRow = Static<typeof invoiceRow>;

export const invoice = Type.Object({
  user: minifiedUserResponse,
  invoiceTotal: Type.Number({ minimum: 0 }),
  invoiceRows: Type.Array(invoiceRow),
});

export type Invoice = Static<typeof invoice>;

export const gasBreakdownRow = Type.Object({
  gasId: Type.Number(),
  gasName: Type.String(),
  priceEurCents: Type.Number({ minimum: 0 }),
});

export type GasBreakdownRow = Static<typeof gasBreakdownRow>;
