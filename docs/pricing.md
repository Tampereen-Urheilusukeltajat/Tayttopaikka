# Pricing Logic

## Overview

Gas prices are stored as **euro cents per litre** (`FLOAT(6,2)`), giving a usable range of 0–9999.9 euro-cents/l (0–99.999 €/l) with up to 3 decimal places when expressed in euros (i.e. 0.001 €/l precision). Air is always free — not because its stored price is zero, but because air fills bypass cost calculation entirely (see [Recording a fill event](#5-recording-a-fill-event)).

---

## Data Model

### `gas`

Static lookup table. Five gases are inserted by migration and never change:

| id | name    |
|----|---------|
| 1  | Air     |
| 2  | Helium  |
| 3  | Oxygen  |
| 4  | Argon   |
| 5  | Diluent |

### `gas_price`

Each row represents a price for one gas over a half-open time interval `[active_from, active_to)`.

```text
id | gas_id | price_eur_cents | active_from         | active_to
---+--------+-----------------+---------------------+---------------------
 1 |      2 |            6.00 | 2000-01-01 00:00:00 | 2026-04-01 00:00:00
 2 |      2 |            6.50 | 2026-04-01 00:00:00 | 9999-12-31 23:59:59
```

Rules enforced by application code:

- Exactly **one** row per gas satisfies `active_from <= NOW < active_to` at any given moment — that is the **current price**.
- At most **one** row per gas has `active_from > NOW` — that is the **future price** (optional).
- All other rows are **past prices** (historical record, never deleted).
- `active_to = '9999-12-31 23:59:59'` is a sentinel meaning "open-ended" (no end date).
- `active_to > active_from` is enforced by a DB check constraint.
- All datetimes are stored as UTC. The backend connection is configured with `timezone: 'Z'`.

### `fill_event_gas_fill`

Links a fill event to the `gas_price` row that was active **at the time of the fill**. The price is locked at fill time — subsequent price changes do not affect historical fills.

```text
fill_event_id | gas_price_id | storage_cylinder_id | volume_litres
```

---

## Lifecycle

### 1. Bootstrap (migration)

When the schema is first created, one `gas_price` row per gas is inserted by migration `20230226120217_insert_default_air_price.ts` with `price_eur_cents = 0` and `active_from = 2000-01-01`. This guarantees every gas always has a current price — there is never a gap.

### 2. Setting realistic prices (seed / admin UI)

In development, `01_development_data.ts` updates the open-ended price rows in-place to realistic values (e.g. Helium 6.00 snt/l, Oxygen 0.60 snt/l). In production, an admin uses the gas price management UI.

### 3. Scheduling a future price change (admin)

`POST /api/gas/price`

- Requires: `gasId`, `priceEurCents`, `activeFrom` (UTC midnight of a future date).
- Guards: returns 409 if a future price already exists for that gas.
- Atomically (within a transaction):
  1. Finds the price row currently active at `activeFrom` via `getGasWithPricingWithActiveFrom`.
  2. Sets that row's `active_to = activeFrom` (capping it).
  3. Inserts new row with `active_from = activeFrom`, `active_to = 9999-12-31 23:59:59`.

The new price takes effect at UTC midnight of the chosen date (02:00–03:00 Finnish time depending on DST).

### 4. Cancelling a future price change (admin)

`DELETE /api/gas/price/:gasPriceId`

- Validates the price exists (404) and is still in the future — checked in the DB via `active_from > NOW()`, not in JS.
- Atomically (within a transaction):
  1. Deletes the future row (`DELETE … WHERE id = ? AND active_from > NOW()`). 0 affected rows → 400.
  2. Restores the preceding row's `active_to` back to `9999-12-31 23:59:59`. Asserts exactly 1 row was updated (invariant: there is always a preceding price).

### 5. Recording a fill event

`POST /api/fill-event`

Within a single transaction:

1. Looks up the currently active `gas_price` row for each gas used, using `active_from <= NOW AND active_to > NOW`.
2. Records `fill_event_gas_fill` rows that reference those `gas_price` ids directly — the price is **frozen at this point**.
3. Calculates the total cost server-side (`volume_litres × price_eur_cents` for each non-air fill) and compares it to the price the client submitted. Mismatch → 400. This prevents a client from submitting a stale price.
4. Air fills are free: `fill_event_gas_fill` rows for air have `storage_cylinder_id = NULL` (air comes directly from the compressor, not from a storage cylinder). `calcTotalCost` returns 0 for any row where `storageCylinderId` is null, and all invoice SQL queries filter `WHERE storage_cylinder_id IS NOT NULL`, so air rows are excluded from every cost aggregation. The `gas_price_id` is still recorded for completeness, but the stored price value for Air is never read.

Volume is calculated as `ceil(startPressure - endPressure) × cylinderVolume` litres.

### 6. Invoicing

`GET /api/invoicing` returns all users with unpaid fill events and their totals.

A fill event is **unpaid** when:

- It has no linked `payment_event`, or
- Its only linked `payment_event` has status `FAILED`.

It is considered **paid** when it has a linked `payment_event` with status `COMPLETED`.

Invoice totals are computed as `SUM(volume_litres × price_eur_cents)` over all non-air fill rows, joined back through the frozen `gas_price_id`. This means invoiced amounts always reflect the price at the time of the fill, regardless of what prices are today.

`POST /api/invoicing` creates `payment_event` rows (status `COMPLETED`) and links them to the relevant fill events, making those fills disappear from future invoices.

---

## Invariants

| Invariant | Where enforced |
| --- | --- |
| One current price per gas at any time | Application code (assert on SELECT, guard on INSERT) + `UNIQUE (gas_id, active_from)` index |
| At most one future price per gas | 409 guard in `createGasPrice` + assert in `getFuturePriceForGas` + `UNIQUE (gas_id, active_to)` index (two open-ended rows for the same gas are impossible) |
| Every gas always has a current price | Initial migration inserts zero-priced rows for all gases |
| Price is frozen at fill time | FK `fill_event_gas_fill.gas_price_id → gas_price.id` |
| Client/server price agreement | Total cost recalculated server-side, compared to client's submitted price |
| `active_to > active_from` | DB check constraint |
| All times are UTC | `timezone: 'Z'` in Knex connection config |

---

## Known Limitations

Gas usage is **self-reported** by the blender operating the filling station. The system cannot verify that the submitted `storageCylinderUsageArr` (storage cylinder IDs and pressure deltas) accurately reflects what was physically dispensed. A blender could under-report volume or omit a gas entirely.

This is an accepted limitation: only users with blender privileges (`isBlender`, `isAdvancedBlender`, `isAdmin`) can submit storage cylinder usage at all, so the attack requires a trusted club role. Regular users can only record air fills (which are free anyway). Hardware-level verification (flow meters, pressure sensors) would be required to close this gap.

Air's `gas_price` row exists in the DB but its price value is intentionally ignored everywhere. To prevent confusion, the admin UI hides the edit button for Air rows, and the backend rejects `POST /api/gas/price` requests for Air with a 400.
