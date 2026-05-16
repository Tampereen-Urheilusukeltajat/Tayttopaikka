import { type Knex } from 'knex';
import { knexController } from '../../database/database';
import { type DBResponse } from '../../types/general.types';
import { type InvoiceRow } from '../../types/invoices.types';
import { type PaymentEvent, PaymentStatus } from '../../types/payment.types';

/**
 * Get unpaid fill events for user. Fill event is unpaid if
 * it is not linked to
 * any payment events or if the payment event has failed
 * @param userId
 * @returns
 */
export const getUnpaidFillEvents = async (
  userId: string,
): Promise<InvoiceRow[]> => {
  const [fillEvents] = await knexController.raw<
    DBResponse<
      Array<{
        fill_event_id: number;
        fill_event_date: string;
        fill_event_description: string;
        fill_event_gas_mixture: string;
        price: number;
      }>
    >
  >(
    `
    WITH gas_fill_price AS (
      SELECT
        fe.id AS fill_event_id,
        SUM(fegf.volume_litres * CAST(gp.price_eur_cents AS DECIMAL(6,2))) AS price
      FROM fill_event fe
      JOIN fill_event_gas_fill fegf ON fegf.fill_event_id = fe.id
      JOIN gas_price gp ON gp.id = fegf.gas_price_id
      WHERE
        fegf.storage_cylinder_id IS NOT NULL
      GROUP BY fe.id
    ),
    diluent_fill_price AS (
      SELECT
        fill_event_id,
        COALESCE(SUM(price_eur_cents), 0) AS price
      FROM fill_event_diluent_fill
      GROUP BY fill_event_id
    ),
    fill_event_price AS (
      SELECT
        fe.id AS fill_event_id,
        CEIL(COALESCE(gfp.price, 0) + COALESCE(dfp.price, 0)) AS price
      FROM fill_event fe
      LEFT JOIN gas_fill_price gfp ON gfp.fill_event_id = fe.id
      LEFT JOIN diluent_fill_price dfp ON dfp.fill_event_id = fe.id
    )
    SELECT DISTINCT
      fe.id AS fill_event_id,
      fe.created_at AS fill_event_date,
      fe.description AS fill_event_description,
      fe.gas_mixture AS fill_event_gas_mixture,
      fep.price
    FROM fill_event fe
    LEFT JOIN fill_event_gas_fill fegf ON fegf.fill_event_id = fe.id
    JOIN fill_event_price fep ON fep.fill_event_id = fe.id
    LEFT JOIN fill_event_payment_event fepe ON fepe.fill_event_id = fe.id
    LEFT JOIN payment_event pe ON pe.id = fepe.payment_event_id
    WHERE
      fep.price > 0 AND
      fe.user_id = ? AND 
      (
        NOT EXISTS (
          SELECT
            fepe2.fill_event_id
          FROM fill_event_payment_event fepe2
          JOIN payment_event pe2 ON 
            pe2.id = fepe2.payment_event_id AND
            pe2.status = "COMPLETED"
          WHERE
            fepe2.fill_event_id = fe.id
        ) 
        AND (
          fepe.fill_event_id IS NULL OR
          pe.status = "FAILED"
        )
      )
  `,
    [userId],
  );

  if (!fillEvents || fillEvents.length === 0) return [];

  return fillEvents.map((v) => ({
    id: v.fill_event_id,
    date: v.fill_event_date,
    description: v.fill_event_description,
    gasMixture: v.fill_event_gas_mixture,
    price: v.price,
  }));
};

/**
 * Calculates the total amount due for all the fill events
 * @param fillEventIds
 */
export const calculateFillEventTotalPrice = async (
  fillEventIds: number[],
): Promise<number> => {
  const [totalPrice] = await knexController.raw<
    DBResponse<Array<{ totalPrice: number }>>
  >(
    `
    WITH gas_fill_price AS (
      SELECT
        fe.id AS fill_event_id,
        SUM(fegf.volume_litres * CAST(gp.price_eur_cents AS DECIMAL(6,2))) AS price
      FROM fill_event fe
      JOIN fill_event_gas_fill fegf ON fegf.fill_event_id = fe.id
      JOIN gas_price gp ON gp.id = fegf.gas_price_id
      WHERE
        fe.id IN (${fillEventIds.map(() => '?').join(',')}) AND
        fegf.storage_cylinder_id IS NOT NULL
      GROUP BY fe.id
    ),
    diluent_fill_price AS (
      SELECT
        fill_event_id,
        COALESCE(SUM(price_eur_cents), 0) AS price
      FROM fill_event_diluent_fill
      WHERE fill_event_id IN (${fillEventIds.map(() => '?').join(',')})
      GROUP BY fill_event_id
    ),
    fill_event_price AS (
      SELECT
        fe.id AS fill_event_id,
        CEIL(COALESCE(gfp.price, 0) + COALESCE(dfp.price, 0)) AS price
      FROM fill_event fe
      LEFT JOIN gas_fill_price gfp ON gfp.fill_event_id = fe.id
      LEFT JOIN diluent_fill_price dfp ON dfp.fill_event_id = fe.id
      WHERE fe.id IN (${fillEventIds.map(() => '?').join(',')})
    )
    SELECT COALESCE(SUM(price), 0) AS totalPrice
    FROM fill_event_price
  `,
    [...fillEventIds, ...fillEventIds, ...fillEventIds],
  );

  if (totalPrice?.[0]?.totalPrice === null) {
    return 0;
  }

  return totalPrice[0].totalPrice;
};

/**
 * Start payment process by creating a payment event and linking the relevant
 * fill events to the event
 * @param userId
 * @param fillEventIds
 * @param totalCost
 * @param status
 * @param trx
 * @returns
 */
export const createPaymentEvent = async (
  userId: string,
  fillEventIds: number[],
  totalCost: number,
  trx: Knex.Transaction,
  status: PaymentStatus = PaymentStatus.created,
): Promise<string> => {
  const res = await trx.raw<Array<Array<{ id: string }>>>(
    `
    INSERT INTO payment_event (user_id, total_amount_eur_cents, status) VALUES (?,?,?) RETURNING id
  `,
    [userId, totalCost, status],
  );

  const [[{ id: insertedPaymentEventId }]] = res;

  await trx.raw(
    `
    INSERT INTO fill_event_payment_event (payment_event_id, fill_event_id)
    VALUES ${fillEventIds.map(() => '(?, ?)').join(',')}
  `,
    [
      ...fillEventIds.flatMap((fillEventId) => [
        insertedPaymentEventId,
        fillEventId,
      ]),
    ],
  );

  return insertedPaymentEventId;
};

/**
 * Update the payment status
 * @param paymentEventId
 * @param newStatus
 */
export const updatePaymentEventStatus = async (
  paymentEventId: string,
  newStatus: PaymentStatus,
): Promise<void> => {
  await knexController.raw(
    `
    UPDATE payment_event
    SET status = ?
    WHERE id = ?
  `,
    [newStatus, paymentEventId],
  );
};

/**
 * Get payment events by ids
 * @param paymentEventId
 */
export const getPaymentEventsWithIds = async (
  paymentEventIds: string[],
): Promise<PaymentEvent[]> => {
  const [paymentEvents] = await knexController.raw<DBResponse<PaymentEvent[]>>(
    `
    SELECT
      id,
      user_id AS userId, 
      status,
      created_at AS createdAt,
      updated_at AS updatedAt,
      total_amount_eur_cents AS totalAmountEurCents
    FROM payment_event
    WHERE id IN (${paymentEventIds.map(() => '?').join(',')})
  `,
    paymentEventIds,
  );

  if (!paymentEvents || paymentEvents.length === 0) return [];

  return paymentEvents;
};
