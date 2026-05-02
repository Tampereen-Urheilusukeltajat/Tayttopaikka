import { type Knex } from 'knex';
import { knexController } from '../../database/database';
import {
  type CreateStorageCylinderBody,
  type StorageCylinder,
  type StorageCylinderWithGasName,
} from '../../types/storageCylinder.types';
import { log } from '../utils/log';

export const getStorageCylinder = async (
  trx: Knex.Transaction,
  id: number,
): Promise<StorageCylinder> => {
  const storageCylinder = await trx<StorageCylinder>('storage_cylinder')
    .where('id', id)
    .first(
      'id',
      'gas_id AS gasId',
      'volume',
      'name',
      'max_pressure AS maxPressure',
    );

  if (storageCylinder === undefined) {
    log.error('Storage cylinder not found');
    throw new Error('Storage cylinder not found');
  }

  return JSON.parse(JSON.stringify(storageCylinder));
};

export const createStorageCylinder = async (
  payload: CreateStorageCylinderBody,
  trx?: Knex.Transaction,
): Promise<StorageCylinder> => {
  const db = trx ?? (await knexController.transaction());
  const sql =
    'INSERT INTO storage_cylinder (gas_id, max_pressure, name, volume) VALUES (?,?,?,?) RETURNING id';
  const params = [
    payload.gasId,
    payload.maxPressure,
    payload.name,
    payload.volume,
  ];

  // Type source: trust me bro & trial and error
  const res = await db.raw<Array<Array<{ id: number }>>>(sql, params);
  const [[{ id: insertedStorageCylinderId }]] = res;

  const insertedSC = await getStorageCylinder(db, insertedStorageCylinderId);

  await db.commit();

  return insertedSC;
};

export const getStorageCylinderWithGasName = async (
  id: string,
  trx?: Knex.Transaction,
): Promise<StorageCylinderWithGasName | undefined> => {
  const db = trx ?? knexController;

  const res = await db.raw<Array<Array<StorageCylinderWithGasName>>>(
    `SELECT
       sc.id,
       sc.gas_id    AS gasId,
       sc.volume,
       sc.name,
       sc.max_pressure AS maxPressure,
       g.name       AS gasName
     FROM storage_cylinder sc
     JOIN gas g ON g.id = sc.gas_id
     WHERE sc.id = :id`,
    { id },
  );

  return res[0][0];
};

export const getStorageCylinders = async (
  trx?: Knex.Transaction,
): Promise<StorageCylinder[]> => {
  const db = trx ?? knexController;

  return db('storage_cylinder').select(
    'id',
    'gas_id AS gasId',
    'volume',
    'name',
    'max_pressure AS maxPressure',
  );
};
