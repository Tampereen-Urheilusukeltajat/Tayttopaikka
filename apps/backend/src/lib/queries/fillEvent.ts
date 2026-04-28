import { knexController, withinTransaction } from '../../database/database';
import {
  type CreateFillEventBody,
  type FillEventGasFill,
  type GetFillEventsResponse,
} from '../../types/fillEvent.types';
import { type DiluentCylinderUsage } from '../../types/storageCylinder.types';
import { type AuthUser } from '../../types/auth.types';
import { log } from '../utils/log';
import { type Knex } from 'knex';
import { getStorageCylinder, getStorageCylinderWithGasName } from './storageCylinder';
import { type Gas, type GasPrice } from '../../types/gas.types';
import { getDiluentPrice } from './gas';
import { selectCylinderSet } from './divingCylinderSet';
import { getUserWithId } from './user';
import { errorHandler } from '../utils/errorHandler';
import { type FastifyReply } from 'fastify';

const getActivePriceId = async (
  trx: Knex.Transaction,
  gasId: string,
): Promise<number> => {
  const prices: GasPrice[] = await trx<GasPrice>('gas_price')
    .where('gas_id', gasId)
    .andWhere('active_from', '<=', knexController.fn.now())
    .andWhere('active_to', '>', knexController.fn.now())
    .select('id');

  const pricesArr = prices.map((price) => JSON.parse(JSON.stringify(price)));

  if (pricesArr.length > 1) {
    log.error(`Multiple active prices were found for gasId: ${gasId}`);
    throw new Error(`Multiple active prices`);
  } else if (prices.length === 0) {
    log.error(`No price was found for gasId: ${gasId}`);
    throw new Error(`Price not found`);
  }

  return pricesArr[0].id;
};

const getAirGasId = async (trx: Knex.Transaction): Promise<string> => {
  const air = await trx<Gas>('gas').where('name', 'Air').first('id');

  if (air === undefined) {
    log.error('Gas id was not found for air');
    throw new Error('Gas id was not found for air');
  }

  return air.id;
};

export const getFillEvents = async (
  userId: string,
): Promise<GetFillEventsResponse[]> => {
  const trx = await knexController.transaction();

  try {
    const fillQuery = (await trx('fill_event')
      .where('user_id', userId)
      .innerJoin(
        'diving_cylinder_set',
        'fill_event.cylinder_set_id',
        'diving_cylinder_set.id',
      )
      .leftJoin('compressor', 'fill_event.compressor_id', 'compressor.id')
      .select(
        'fill_event.id',
        'fill_event.user_id as userId',
        'diving_cylinder_set.name as cylinderSetName',
        'diving_cylinder_set.id as cylinderSetId',
        'fill_event.gas_mixture as gasMixture',
        'fill_event.description',
        'fill_event.created_at as createdAt',
        'compressor.id as compressorId',
        'compressor.name as compressorName',
      )) as Array<Omit<GetFillEventsResponse, 'price'>>;

    const result = await Promise.all(
      fillQuery.map(async (fillEvent): Promise<GetFillEventsResponse> => {
        const price = await calcTotalCost(trx, Number(fillEvent.id));

        return {
          ...fillEvent,

          price,
        };
      }),
    );

    await trx.commit();
    return result;
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

export const createFillEvent = async (
  authUser: AuthUser,
  body: CreateFillEventBody,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const {
    cylinderSetId,
    gasMixture,
    filledAir,
    storageCylinderUsageArr,
    diluentCylinderUsageArr = [],
    description,
    price,
    compressorId,
  } = body;

  if (
    !filledAir &&
    storageCylinderUsageArr.length === 0 &&
    diluentCylinderUsageArr.length === 0
  ) {
    return errorHandler(reply, 400, 'No gases were given');
  }

  let fillEventId: number;
  let userId: string;

  try {
    ({ fillEventId, userId } = await withinTransaction(async (trx) => {
      const user = await getUserWithId(authUser.id, true, trx);
      if (user === undefined) throw new Error('User not found');

      if (
        !(user.isBlender || user.isAdvancedBlender || user.isAdmin) &&
        (storageCylinderUsageArr.length !== 0 ||
          diluentCylinderUsageArr.length !== 0)
      ) {
        throw new Error('No blender privileges');
      }

      const set = await selectCylinderSet(trx, cylinderSetId);
      if (set === undefined) throw new Error('Cylinder set not found');

      const params: Array<string | null> = [user.id, cylinderSetId, gasMixture];
      const sql =
        'INSERT INTO fill_event (user_id, cylinder_set_id, gas_mixture, compressor_id, description) VALUES (?,?,?,?,?) RETURNING id';
      params.push(compressorId ?? null);
      params.push(description ?? null);

      // Use knex.raw to enable use of RETURNING clause to avoid race conditions
      const res = await trx.raw(sql, params);
      const id = JSON.parse(JSON.stringify(res))[0][0].id as number;

      if (filledAir) {
        const airGasId = await getAirGasId(trx);
        const airPriceId = await getActivePriceId(trx, airGasId);
        await trx('fill_event_gas_fill').insert({
          fill_event_id: id,
          gas_price_id: airPriceId,
        });
      }

      await Promise.all(
        storageCylinderUsageArr.map(async (scu): Promise<void> => {
          if (scu.startPressure < scu.endPressure) {
            throw new Error('Negative fill pressure');
          }
          const storageCylinder = await getStorageCylinder(
            trx,
            scu.storageCylinderId,
          );
          const priceId = await getActivePriceId(trx, storageCylinder.gasId);
          await trx('fill_event_gas_fill').insert({
            fill_event_id: id,
            gas_price_id: priceId,
            storage_cylinder_id: storageCylinder.id,
            volume_litres:
              Math.ceil(scu.startPressure - scu.endPressure) *
              storageCylinder.volume,
          });
        }),
      );

      await Promise.all(
        diluentCylinderUsageArr.map(async (dcu): Promise<void> => {
          if (dcu.startPressure < dcu.endPressure) {
            throw new Error('Negative fill pressure');
          }
          if (dcu.oxygenPercentage + dcu.heliumPercentage > 100) {
            throw new Error('Oxygen and helium percentages must not exceed 100');
          }
          const storageCylinder = await getStorageCylinderWithGasName(
            String(dcu.storageCylinderId),
            trx,
          );
          if (!storageCylinder) throw new Error('Storage cylinder not found');
          if (storageCylinder.gasName !== 'Diluent')
            throw new Error('Storage cylinder is not a diluent cylinder');

          const volumeLitres =
            Math.ceil(dcu.startPressure - dcu.endPressure) *
            storageCylinder.volume;

          const serverPrice = await getDiluentPrice(
            String(dcu.storageCylinderId),
            dcu.oxygenPercentage,
            dcu.heliumPercentage,
            trx,
          );

          await trx('fill_event_diluent_fill').insert({
            fill_event_id: id,
            storage_cylinder_id: dcu.storageCylinderId,
            volume_litres: volumeLitres,
            oxygen_percentage: dcu.oxygenPercentage,
            helium_percentage: dcu.heliumPercentage,
            oxygen_gas_price_id: serverPrice.oxygenGasPriceId,
            helium_gas_price_id: serverPrice.heliumGasPriceId,
            price_eur_cents: serverPrice.pricePerLitreCents * volumeLitres,
          });
        }),
      );

      // Check that the price advertised to the user is correct
      const totalCost = await calcTotalCost(trx, id);
      if (totalCost !== price) throw new Error('Price mismatch');

      return { fillEventId: id, userId: user.id };
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error(message);
    log.debug(authUser.id);
    log.debug(body);

    switch (message) {
      case 'User not found':
        return errorHandler(reply, 500);
      case 'No blender privileges':
        return errorHandler(reply, 403, 'User does not have blender privileges');
      case 'Cylinder set not found':
        return errorHandler(reply, 400, 'Cylinder set was not found');
      case 'Storage cylinder not found':
        return errorHandler(reply, 400, 'Invalid storage cylinder');
      case 'Price not found':
        return errorHandler(reply, 500);
      case 'Multiple active prices':
        return errorHandler(reply, 500);
      case 'Gas id was not found for air':
        return errorHandler(reply, 500);
      case 'Storage cylinder is not a diluent cylinder':
        return errorHandler(reply, 400, 'Storage cylinder is not a diluent cylinder');
      case 'Oxygen and helium percentages must not exceed 100':
        return errorHandler(reply, 400, 'Oxygen and helium percentages must not exceed 100');
      case 'Negative fill pressure':
        return errorHandler(reply, 400, 'Cannot have negative fill pressure');
      case 'Price mismatch':
        return errorHandler(reply, 400, 'Client price did not match server price');
      default:
        return errorHandler(reply, 500);
    }
  }

  return reply.code(201).send({
    id: fillEventId,
    userId,
    ...body,
  });
};

export const calcTotalCost = async (
  trx: Knex.Transaction,
  id: number,
): Promise<number> => {
  const fillings: FillEventGasFill[] = await trx<FillEventGasFill>(
    'fill_event_gas_fill',
  )
    .where('fill_event_id', id)
    .select(
      'storage_cylinder_id as storageCylinderId',
      'gas_price_id as gasPriceId',
      'volume_litres as volumeLitres',
    );
  const fillArr = fillings.map((fill) =>
    JSON.parse(JSON.stringify(fill)),
  ) as FillEventGasFill[];

  const gasFillCosts: number[] = await Promise.all(
    fillArr.map(async (fill): Promise<number> => {
      if (fill.storageCylinderId === null) {
        // compressed air
        return 0;
      }
      const gasPrice: GasPrice = await trx<GasPrice>('gas_price')
        .where('id', fill.gasPriceId)
        .first('price_eur_cents as priceEurCents');
      const price = JSON.parse(JSON.stringify(gasPrice));
      return fill.volumeLitres * price.priceEurCents;
    }),
  );

  const diluentRes = await trx.raw<Array<Array<{ total: number }>>>(
    `SELECT COALESCE(SUM(price_eur_cents), 0) AS total
     FROM fill_event_diluent_fill
     WHERE fill_event_id = :id`,
    { id },
  );
  const diluentTotal: number = diluentRes[0][0].total;

  return Math.ceil(
    gasFillCosts.reduce((acc, curValue) => acc + curValue, 0) + diluentTotal
  );
};
