## Why

Users with zero personal cylinder sets currently cannot submit any fill event at all, even when club cylinder sets are available to fill. This is a leftover assumption from before club cylinders existed: the backend and the inner form components already fully support club-only fills, but both top-level logbook views gate on the user owning at least one personal cylinder set before rendering the fill form.

## What Changes

- `Logbook.tsx` (regular/air-fill flow): stop requiring `divingCylinderSets.length > 0` to render the fill form. Render it when the user has personal cylinder sets **or** club cylinder sets available (plus other required data, e.g. compressors).
- `BlenderLogbook.tsx` (blender/gas-fill flow): same fix — stop requiring `divingCylinderSets.length > 0`; gate instead on personal-or-club availability alongside the existing storage cylinder / gas data requirements.
- Update the Finnish "you have no personal cylinder set to fill" dead-end message in both views so it only shows when the user has **neither** personal **nor** club cylinder sets available. When only club cylinders are available, the message disappears and the form renders directly.

No backend changes are required — `apps/backend/src/lib/queries/fillEvent.ts` already permits fill events made up solely of club cylinder sets; the bug is confined to the two frontend view-level gates.

## Capabilities

### New Capabilities

- `club-cylinder-fill-access`: Users without any personal cylinder sets can still submit fill events against club cylinder sets, in both the regular (air) logbook and the blender logbook, as long as club cylinder sets are available.

### Modified Capabilities

(none — no existing spec currently documents this gating behavior)

## Non-goals

- No changes to backend fill event validation, pricing, or authorization — the existing club-cylinder ownership check (`!s.isClubCylinder && s.owner !== user.id`) is already correct and is out of scope.
- No changes to the inner tile/form components (`FillingTile.tsx`, `BasicInfoTile.tsx`) — they already correctly render club cylinders independently of personal ownership.
- No changes to how users acquire or register personal cylinder sets.
- No change to the storage-cylinder/gas requirements already gating the blender flow (`storageCylinders.length > 0`, `gases.length > 0`) — those reflect a real domain requirement (you need gas sources to do a gas fill) and are unrelated to the ownership bug.

## Impact

- **Frontend only**: `apps/frontend/src/views/Logbook.tsx`, `apps/frontend/src/views/BlenderLogbook.tsx`.
- No migrations, no pricing logic, no backend route or query changes.
- No API contract changes.
