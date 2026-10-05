## Context

`Logbook.tsx` and `BlenderLogbook.tsx` each compute a `requiredDataLoaded` boolean that gates whether the fill form renders at all. Both currently require `divingCylinderSets.length > 0` (the user's personal cylinder sets), inherited from before club cylinders existed. Club cylinder sets (`clubCylinderSets`, fetched via `useClubCylinderQuery()`) are already fetched in both views and already passed down to the inner form components (`FillingTile.tsx`, `BasicInfoTile.tsx`), which render a club-cylinder picker independently of personal ownership. The backend (`fillEvent.ts`) already accepts club-only fill events. The only fix needed is relaxing the two `requiredDataLoaded` computations and their associated empty-state messages.

## Goals / Non-Goals

**Goals:**

- Let a user with zero personal cylinder sets reach and submit the fill form when at least one club cylinder set exists.
- Keep the existing empty-state message for the genuinely-empty case (no personal **and** no club cylinders).
- Keep both views' other data requirements (compressors, storage cylinders, gases) unchanged — those are real domain prerequisites, not ownership gates.

**Non-Goals:**

- No change to backend validation/authorization.
- No change to inner tile components — they're already correct.
- No change to how `clubCylinderSets` or `divingCylinderSets` are fetched.

## Decisions

**Gate condition**: change `(divingCylinderSets?.length ?? 0) > 0` to `(divingCylinderSets?.length ?? 0) > 0 || (clubCylinderSets?.length ?? 0) > 0` in both views' `requiredDataLoaded`.

Alternative considered: drop the cylinder-set check from `requiredDataLoaded` entirely and let the inner form render with zero selectable cylinders, showing its own empty state. Rejected — this would require touching `FillingTile.tsx`/`BasicInfoTile.tsx` (out of scope per the proposal's non-goals) and would surface a less clear message than the existing top-level one. The OR-condition keeps the fix minimal and contained to the two view files.

**Empty-state message condition**: change the message guard from `(!divingCylinderSets || divingCylinderSets.length < 1)` to only show when both lists are empty: `(divingCylinderSets?.length ?? 0) < 1 && (clubCylinderSets?.length ?? 0) < 1`.

**BlenderLogbook's other requirements** (`storageCylinders.length > 0`, `gases.length > 0`) are left untouched — they gate on real domain prerequisites for a gas fill, unrelated to personal cylinder ownership, and are not part of this bug.

## Risks / Trade-offs

- [Risk] `clubCylinderSets` query could itself be loading/undefined when `requiredDataLoaded` is evaluated, causing a flash of the old message before data arrives → Mitigation: this is pre-existing behavior for `divingCylinderSets` too (no explicit loading state today); not introduced or worsened by this change, so no new handling needed.
- [Risk] A club with zero club cylinder sets configured and a user with zero personal sets still correctly sees the dead-end message — verified by the updated AND-of-empties condition.

## Migration Plan

Pure frontend logic change, no migrations, no backend deploy coordination needed. Ships as a normal frontend release.

## Open Questions

None — scope is narrow and confirmed against current code in both files.
