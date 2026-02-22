import { type Knex } from 'knex';
import { knexController } from '../../database/database';
import {
  type DivingCylinder,
  type DivingCylinderSet,
  type DivingCylinderSetBasicInfo,
  type DivingCylinderWithSetId,
} from '../../types/divingCylinderSet.types';
import { type DBResponse } from '../../types/general.types';
import { log } from '../utils/log';

type CylinderSetWithCylinderRow = {
  id: string;
  owner: string;
  name: string;
  isClubCylinder: boolean;
  cylinderId: string;
  volume: number;
  pressure: number;
  material: string;
  serialNumber: string;
  inspection: string;
};

export const divingCylinderSetExists = async (
  divingCylinderSetId: string,
  userId: string,
  trx?: Knex.Transaction,
): Promise<boolean> => {
  const db = trx ?? knexController;

  const [exists] = await db.raw<DBResponse<number[]>>(
    `
    SELECT
      1
    FROM diving_cylinder_set
    WHERE
      id = :divingCylinderSetId AND
      owner = :userId
  `,
    {
      divingCylinderSetId,
      userId,
    },
  );

  if (exists.length) return true;

  return false;
};

export const clubCylinderSetExists = async (
  divingCylinderSetId: string,
  trx?: Knex.Transaction,
): Promise<boolean> => {
  const db = trx ?? knexController;

  const [exists] = await db.raw<DBResponse<number[]>>(
    `
    SELECT
      1
    FROM diving_cylinder_set
    WHERE
      id = :divingCylinderSetId AND
      is_club_cylinder = 1
  `,
    {
      divingCylinderSetId,
    },
  );

  return exists.length > 0;
};

export const archiveDivingCylinderSet = async (
  divingCylinderSetId: string,
  trx?: Knex.Transaction,
): Promise<void> => {
  const db = trx ?? knexController;

  await db.raw(
    `
    UPDATE diving_cylinder_set
    SET archived = true
    WHERE
      id = :divingCylinderSetId
  `,
    {
      divingCylinderSetId,
    },
  );
};

export const getUsersDivingCylinderSets = async (
  userId: string,
  trx?: Knex.Transaction,
): Promise<DivingCylinderSet[]> => {
  const db = trx ?? knexController;

  const [results] = await db.raw<DBResponse<CylinderSetWithCylinderRow[]>>(
    `
    SELECT
      dcs.id,
      dcs.owner,
      dcs.name,
      dcs.is_club_cylinder AS isClubCylinder,
      dc.id AS cylinderId,
      dc.volume,
      dc.pressure,
      dc.material,
      dc.serial_number AS serialNumber,
      dc.inspection
    FROM diving_cylinder_set dcs
    INNER JOIN diving_cylinder_to_set dcts ON dcs.id = dcts.cylinder_set
    INNER JOIN diving_cylinder dc ON dcts.cylinder = dc.id
    WHERE
      dcs.owner = :userId AND
      dcs.archived = 0 AND
      dcs.is_club_cylinder = 0
  `,
    { userId },
  );

  if (results.length === 0) return [];

  const cylinderSetsMap = new Map<string, DivingCylinderSet>();

  for (const row of results) {
    if (!cylinderSetsMap.has(row.id)) {
      cylinderSetsMap.set(row.id, {
        id: row.id,
        owner: row.owner,
        name: row.name,
        isClubCylinder: row.isClubCylinder,
        cylinders: [],
      });
    }

    cylinderSetsMap.get(row.id)!.cylinders.push({
      id: row.cylinderId,
      volume: row.volume,
      pressure: row.pressure,
      material: row.material,
      serialNumber: row.serialNumber,
      inspection: row.inspection,
    });
  }

  return Array.from(cylinderSetsMap.values());
};

export const getClubCylinderSets = async (
  trx?: Knex.Transaction,
): Promise<DivingCylinderSet[]> => {
  const db = trx ?? knexController;

  const [results] = await db.raw<DBResponse<CylinderSetWithCylinderRow[]>>(
    `
    SELECT
      dcs.id,
      dcs.owner,
      dcs.name,
      dcs.is_club_cylinder AS isClubCylinder,
      dc.id AS cylinderId,
      dc.volume,
      dc.pressure,
      dc.material,
      dc.serial_number AS serialNumber,
      dc.inspection
    FROM diving_cylinder_set dcs
    INNER JOIN diving_cylinder_to_set dcts ON dcs.id = dcts.cylinder_set
    INNER JOIN diving_cylinder dc ON dcts.cylinder = dc.id
    WHERE
      dcs.is_club_cylinder = 1 AND
      dcs.archived = 0
  `,
  );

  if (results.length === 0) return [];

  const cylinderSetsMap = new Map<string, DivingCylinderSet>();

  for (const row of results) {
    if (!cylinderSetsMap.has(row.id)) {
      cylinderSetsMap.set(row.id, {
        id: row.id,
        owner: row.owner,
        name: row.name,
        isClubCylinder: row.isClubCylinder,
        cylinders: [],
      });
    }

    cylinderSetsMap.get(row.id)!.cylinders.push({
      id: row.cylinderId,
      volume: row.volume,
      pressure: row.pressure,
      material: row.material,
      serialNumber: row.serialNumber,
      inspection: row.inspection,
    });
  }

  return Array.from(cylinderSetsMap.values());
};

/**
 * @deprecated
 */
const selectSingleCylinderSet = async (
  trx: Knex.Transaction,
  set: DivingCylinderSet,
  id?: string,
): Promise<void> => {
  set.cylinders = await trx('diving_cylinder')
    .innerJoin(
      'diving_cylinder_to_set',
      'diving_cylinder.id',
      '=',
      'diving_cylinder_to_set.cylinder',
    )
    .select<DivingCylinder[]>(
      'id',
      'volume',
      'pressure',
      'material',
      'serial_number as serialNumber',
      'inspection',
    )
    .where('diving_cylinder_to_set.cylinder_set', id ?? '');
};

/**
 * @deprecated
 */
export const selectCylinderSet = async (
  trx: Knex.Transaction,
  id: string,
): Promise<DivingCylinderSet | undefined> => {
  const set: DivingCylinderSet | undefined = await trx('diving_cylinder_set')
    .select<DivingCylinderSet>(
      'id',
      'owner',
      'name',
      'is_club_cylinder as isClubCylinder',
    )
    .where('id', id)
    .first();

  if (set === undefined) {
    log.debug('Cylinder set seems to be missing: ' + id);
    return undefined;
  }

  await selectSingleCylinderSet(trx, set, id);

  if (set.cylinders.length === 0) {
    log.error('set without cylinders', set);
  }
  return set;
};
