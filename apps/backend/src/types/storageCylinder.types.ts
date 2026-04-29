import { Type, type Static } from '@sinclair/typebox';

export const storageCylinderUsage = Type.Object({
  storageCylinderId: Type.Integer({ minimum: 0 }),
  startPressure: Type.Number({ minimum: 0, maximum: 500 }),
  endPressure: Type.Number({ minimum: 0, maximum: 500 }),
});

export type StorageCylinderUsage = Static<typeof storageCylinderUsage>;

export const diluentCylinderUsage = Type.Object({
  storageCylinderId: Type.Integer({ minimum: 0 }),
  startPressure: Type.Number({ minimum: 0, maximum: 500 }),
  endPressure: Type.Number({ minimum: 0, maximum: 500 }),
  oxygenPercentage: Type.Number({ minimum: 0, maximum: 100 }),
  heliumPercentage: Type.Number({ minimum: 0, maximum: 100 }),
});

export type DiluentCylinderUsage = Static<typeof diluentCylinderUsage>;

export const createStorageCylinderBody = Type.Object({
  gasId: Type.String(),
  name: Type.String({ maxLength: 256 }),
  maxPressure: Type.Integer({ exclusiveMinimum: 0, maximum: 500 }),
  volume: Type.Integer({ exclusiveMinimum: 0, maximum: 200 }),
});

export type CreateStorageCylinderBody = Static<
  typeof createStorageCylinderBody
>;

export const storageCylinder = Type.Intersect([
  Type.Object({ id: Type.String(), gasId: Type.Integer() }),
  Type.Omit(createStorageCylinderBody, ['gasId']),
]);

export type StorageCylinder = Static<typeof storageCylinder>;

export const storageCylinderWithGasName = Type.Intersect([
  storageCylinder,
  Type.Object({ gasName: Type.String() }),
]);

export type StorageCylinderWithGasName = Static<
  typeof storageCylinderWithGasName
>;
