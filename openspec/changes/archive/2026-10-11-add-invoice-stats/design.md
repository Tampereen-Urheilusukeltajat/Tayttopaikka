## Context

The invoicing page (`apps/frontend/src/views/Invoice/Invoice.tsx`) fetches `GET /invoicing` (admin-only) which returns `Invoice[]` — one entry per user with an outstanding balance, each carrying `invoiceTotal` and a flat `invoiceRows[]` (one row per unpaid fill event, already summed across whatever gases that fill event used). This same response already drives the table, the Excel export, and the "mark as invoiced" mutation.

The user's own fill history page (`ListFillEvents.tsx`) has an established summary-tile pattern (`FillEventStats.tsx`): a row of plain Bootstrap `card` tiles (`row g-3` / `col-md-4` / `card-body` / `card-subtitle text-muted` + `card-text fs-3 fw-bold`), computed entirely from data the page already has in memory. This change reuses that visual pattern for the invoicing page.

Five of the six stats agreed on (total due, unpaid user count, unpaid fill event count, largest single balance, oldest unpaid fill) are plain reductions over the existing `Invoice[]` payload and need no backend change.

The sixth — pending revenue broken down by gas type — cannot be derived from `Invoice[]` as it stands, because `invoiceRows` is at fill-event grain: a single fill event (e.g. a trimix fill) can span multiple `fill_event_gas_fill` rows (Helium + Oxygen) plus optionally a `fill_event_diluent_fill` row, and `getUnpaidFillEvents` (`apps/backend/src/lib/queries/payment.ts`) already collapses all of that into one summed `price` before it reaches the frontend. Splitting by gas requires aggregating at the `fill_event_gas_fill` / `fill_event_diluent_fill` grain, across all users at once — a different query shape, not an extra field.

## Goals / Non-Goals

**Goals:**

- Give admins an at-a-glance summary of outstanding balances on the invoicing page, visually consistent with `FillEventStats`.
- Surface which gases are driving the pending revenue, since pricing in this system is inherently gas-type-specific.
- Keep the blast radius minimal: the existing `GET /invoicing` response, the Excel export, and the mark-as-invoiced flow must not change shape or behavior.

**Non-Goals:**

- No due-date/aging/overdue system — "oldest unpaid fill" is a simple min-date proxy, not a new domain concept.
- No server-side recomputation of stats that are already fully derivable from data the page already fetches (avoids two sources of truth for the same numbers).
- No changes to pricing calculation logic — this only aggregates and displays prices already frozen at fill time (`fill_event_gas_fill.gas_price_id`, `fill_event_diluent_fill.price_eur_cents`).

## Decisions

### Split the work: client-side math for 5 stats, one new endpoint for the gas breakdown

Rejected alternative: a single bundled `GET /invoicing/stats` endpoint returning all six stats. Rejected because total/count/largest/oldest would then be computed twice — once server-side for the stats endpoint, once implicitly represented in the already-fetched `Invoice[]` table data — fetched via two separate requests that could race or momentarily disagree (e.g. a mark-as-invoiced mutation lands between the two fetches). Keeping the cheap stats as pure derivations of data already on the page avoids that entirely.

### New endpoint: `GET /invoicing/gas-breakdown`

- Route file: `apps/backend/src/routes/invoicing/get-gas-breakdown.ts`, registered the same way as `get-invoices.ts` (`preValidation: [fastify['authenticate'], fastify['admin']]`).
- Response type (TypeBox, added to `apps/backend/src/types/invoices.types.ts`):
  ```ts
  const gasBreakdownRow = Type.Object({
    gasId: Type.Number(),
    gasName: Type.String(),
    priceEurCents: Type.Number({ minimum: 0 }),
  });
  export type GasBreakdownRow = Static<typeof gasBreakdownRow>;
  ```
  Response: `Type.Array(gasBreakdownRow)`.
- Query function: `getPendingGasCostBreakdown()` added to `apps/backend/src/lib/queries/payment.ts`, next to `getUnpaidFillEvents`. It reuses the same "fill event is unpaid" predicate (no completed payment event linked, or only a failed one) but evaluates it globally instead of per `user_id = ?`, and groups by `gas.id` instead of `fill_event.id`:
  - One branch sums `fegf.volume_litres * gp.price_eur_cents` from `fill_event_gas_fill` joined to `gas_price` → `gas`, for Helium/Oxygen/Argon (storage-cylinder fills).
  - One branch sums `price_eur_cents` from `fill_event_diluent_fill`, attributed to gas id 5 (Diluent).
  - Air (gas id 1) is excluded from the query entirely — it's always free and would otherwise only ever contribute a meaningless `€0` row.
  - Results are rounded/ceiled per the existing pricing convention (whole cents) and returned as a flat array sorted by `gasId`.

### Frontend: new query hook mirrors `invoiceQuery.ts`

- `apps/frontend/src/lib/apiRequests/invoiceRequests.ts`: add `getInvoiceGasBreakdown()`.
- `apps/frontend/src/lib/queries/invoiceQuery.ts` (or a new `invoiceGasBreakdownQuery.ts`): add `useInvoiceGasBreakdownQuery()`, same shape as `useInvoiceQuery` (React Query, `staleTime: 0`, toast on error per existing convention in that file — not useEffect-based in new code, per project convention of avoiding `useEffect` for error toasts in query hooks; this one existing hook already uses `useEffect` and is left as-is since it's out of scope).
- `InvoiceStats` component (`apps/frontend/src/components/Invoice/InvoiceStats.tsx` or co-located under `views/Invoice/`): takes the already-fetched `Invoice[]` as a prop (no fetching of its own, consistent with `FillEventStats` taking `fillEvents` as a prop) and renders the five client-derived tiles plus a gas-breakdown tile/list that uses the new hook internally (acceptable to fetch here since it's the one stat that genuinely needs its own request — the data-layer separation principle is about fetching living in `lib/`, not about every tile sharing one fetch).

### Gas breakdown presentation: compact list inside one card, not five separate tiles

Rejected alternative: one Bootstrap card tile per gas (mirrors the other stats visually but wastes a `col-md-4` slot per gas and doesn't scale if a gas is ever added). Instead: one card titled "Odottava hinnasto kaasuittain" (or similar) containing a small row per gas (`gasName: priceEurCents €`), same visual language as `PricingTile.tsx` already uses for the price list — reusing an existing pattern rather than inventing a new one.

## Risks / Trade-offs

- **Two requests instead of one** on page load (`GET /invoicing` + `GET /invoicing/gas-breakdown`) → Mitigation: both are small admin-only queries on an already low-traffic page; not a performance concern at this scale.
- **Duplicated "is this fill event unpaid" predicate** now lives in two places (`getUnpaidFillEvents` and the new gas breakdown query) → Mitigation: flag clearly in code comments/PR description that both must be kept in sync if the unpaid-fill-event definition ever changes; extracting a shared SQL fragment is possible but adds complexity for two call sites — acceptable trade-off for now, revisit if a third consumer appears.
- **Gas breakdown and the main invoice total could show slightly different grand totals** if a payment event completes between the two fetches (race condition inherent to splitting into two requests) → Mitigation: cosmetic/informational tiles only, not used for any financial decision or mutation; acceptable given this page's existing mark-as-invoiced flow already requires an explicit admin confirmation step after export.

## Open Questions

- Exact Finnish copy for tile labels and the gas-breakdown card title (to be finalized during implementation, consistent with existing Finnish-only UI copy).
