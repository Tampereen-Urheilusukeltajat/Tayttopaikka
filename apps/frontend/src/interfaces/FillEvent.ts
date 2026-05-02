export type FillEvent = {
  id: string;
  userId: string;
  cylinderSetId: string;
  cylinderSetName: string;
  gasMixture: string;
  description: string;
  price: number;
  compressorId?: string;
  compressorName?: string;
  createdAt: string;
};

export type StorageCylinderUsage = {
  storageCylinderId: number;
  startPressure: number;
  endPressure: number;
};

export type DiluentCylinderUsage = {
  storageCylinderId: number;
  startPressure: number;
  endPressure: number;
  oxygenPercentage: number;
  heliumPercentage: number;
};

export type NewFillEvent = {
  cylinderSetId: string;
  gasMixture: string;
  filledAir: boolean;
  description: string;
  price: number;
  storageCylinderUsageArr: StorageCylinderUsage[];
  diluentCylinderUsageArr?: DiluentCylinderUsage[];
  compressorId?: string;
};

export type CreatedFillEvent = NewFillEvent & {
  id: string;
  userId: string;
};
