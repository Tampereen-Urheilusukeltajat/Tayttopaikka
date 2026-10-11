## 1. Backend: gas breakdown query and endpoint

- [x] 1.1 Add `getPendingGasCostBreakdown()` to `apps/backend/src/lib/queries/payment.ts`: aggregate `fill_event_gas_fill` (joined to `gas_price`/`gas`) and `fill_event_diluent_fill` by gas id, across all users, reusing the "unpaid fill event" predicate from `getUnpaidFillEvents` (no completed payment event, or only a failed one). Exclude Air (gas id 1). Return rows sorted by `gasId`.
- [x] 1.2 Add `gasBreakdownRow` TypeBox schema and `GasBreakdownRow` type to `apps/backend/src/types/invoices.types.ts`.
- [x] 1.3 Add route `apps/backend/src/routes/invoicing/get-gas-breakdown.ts` (`GET /invoicing/gas-breakdown`), admin-only (`fastify['authenticate']`, `fastify['admin']`), mirroring `get-invoices.ts`.
- [x] 1.4 Register the new route alongside the existing invoicing routes (check `apps/backend/src/routes/invoicing/index.ts` or equivalent route registration). — routes are autoloaded by directory (`@fastify/autoload`), so no separate registration was needed.
- [x] 1.5 Write backend tests covering: pending revenue correctly summed per gas, Air excluded, a mixed-gas (Trimix) fill event split correctly between Helium and Oxygen, zero/empty case, and 403 for non-admin requests.

## 2. Frontend: data layer

- [x] 2.1 Add `getInvoiceGasBreakdown()` to `apps/frontend/src/lib/apiRequests/invoiceRequests.ts`.
- [x] 2.2 Add `useInvoiceGasBreakdownQuery()` hook (new file or alongside `invoiceQuery.ts`), following the existing query-key/`UseQuery` conventions in that file. — written without the `useEffect`-toast pattern the rest of the file uses, per standing feedback to avoid that in query hooks.
- [x] 2.3 Add the new query key to `apps/frontend/src/lib/queries/queryKeys.ts`.

## 3. Frontend: summary tiles component

- [x] 3.1 Create `InvoiceStats` component taking the already-fetched `Invoice[]` as a prop (no fetching of its own for these 5 stats), computing: total due, unpaid user count, unpaid fill event count, largest single balance, oldest unpaid fill date — styled with the same Bootstrap card pattern as `FillEventStats.tsx`. — made fully presentational (gas breakdown is also passed in as a prop, fetched by the `Invoice` view) to keep fetching in the data layer per CLAUDE.md's data/presentation separation rule.
- [x] 3.2 Handle the empty state (no outstanding invoices) with zeroed tiles and a placeholder for the oldest-unpaid-fill tile.
- [x] 3.3 Add a gas-breakdown card/list to (or alongside) `InvoiceStats`, styled after the existing `PricingTile.tsx` list pattern (one row per gas: name + price).
- [x] 3.4 Wire `InvoiceStats` into `apps/frontend/src/views/Invoice/Invoice.tsx` above the existing `CommonTableV2` table, passing the already-loaded invoice data.

## 4. Verification

- [x] 4.1 Run `pnpm run check-types` and `pnpm run lint`. — both clean. (`pnpm run format` was also tried but reformats the whole repo regardless of what's staged, so its unrelated changes were reverted to keep this change's diff scoped.)
- [x] 4.2 Run backend tests (`pnpm --filter @tayttopaikka/backend test`). — 249/249 pass, including the 5 new gas-breakdown tests.
- [x] 4.3 Manually verify against the running app: started the real backend + frontend dev servers against the local dev database (not just test fixtures), logged in as an admin, and called both `GET /invoicing` and `GET /invoicing/gas-breakdown` directly — confirmed the gas breakdown excludes Air and returns sane non-zero totals for Helium/Oxygen/Argon/Diluent, and cross-checked the 5 client-derived stats (total due, unpaid users, unpaid fill events, largest balance, oldest unpaid fill) by recomputing them from the real `/invoicing` payload — they match exactly what `InvoiceStats` computes. No headless browser/screenshot tool was available in this environment to visually render the page, so this was verified via the live API responses rather than a screenshot.
