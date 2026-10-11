## Why

The invoicing page currently shows admins a raw table of unpaid fill events per user with no at-a-glance summary — to answer "how much is outstanding right now" or "who owes the most" an admin has to scan or export the whole table. The user's own fill history page already has a proven summary-tile pattern (`FillEventStats`) for exactly this kind of glanceable context; the invoicing page should get the admin-facing equivalent.

## What Changes

- Add a summary stats row to the invoicing page (`/invoicing`), styled like the existing `FillEventStats` Bootstrap card tiles, showing:
  - Total amount due (sum of all unpaid invoice totals)
  - Number of unpaid invoices (users with an outstanding balance)
  - Number of unpaid fill events
  - Largest single outstanding balance
  - Oldest unpaid fill event (age/date)
- All five of the above are computed client-side from data the invoicing page already fetches (`GET /invoicing`) — no backend change needed for these.
- Add a new backend endpoint `GET /invoicing/gas-breakdown` (admin-only) returning pending revenue grouped by gas type (Helium, Oxygen, Argon, Diluent), aggregated across all unpaid fill events for all users. Air is excluded (always free, not relevant to a revenue breakdown).
- Add a corresponding frontend query hook and a gas-breakdown tile/table consuming the new endpoint.

## Capabilities

### New Capabilities

- `invoicing-stats`: Summary statistics for the admin invoicing page — both the client-derived headline tiles and the server-computed per-gas pending revenue breakdown.

### Modified Capabilities

(none — no existing capability specs cover invoicing)

## Non-goals

- No due-date or "overdue" concept is introduced — the oldest-unpaid-fill stat is a proxy for staleness, not a formal overdue/aging system.
- No changes to the existing `GET /invoicing` response shape, the Excel export flow, or the "mark as invoiced" mutation — those stay exactly as they are today.
- No historical/trend comparison (e.g. vs. the last invoicing run) — out of scope for this change.
- No changes to per-user invoice rows or table columns.

## Impact

- **Frontend**: new `InvoiceStats` component (and a gas-breakdown sub-component) added to `apps/frontend/src/views/Invoice/Invoice.tsx`; new query hook + API request function for the gas-breakdown endpoint, following the existing `invoiceQuery.ts` / `invoiceRequests.ts` pattern.
- **Backend**: new query function alongside `getUnpaidFillEvents` in `apps/backend/src/lib/queries/payment.ts` (or a new `invoice.ts` query), a new route under `apps/backend/src/routes/invoicing/`, and a new TypeBox response type in `apps/backend/src/types/invoices.types.ts`. No migrations. No pricing logic changes — this only aggregates and displays prices already computed and frozen at fill time.
