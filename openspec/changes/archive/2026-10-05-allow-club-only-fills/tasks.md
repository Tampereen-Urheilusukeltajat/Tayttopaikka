## 1. Regular logbook (Logbook.tsx)

- [x] 1.1 Update `requiredDataLoaded` to accept `(divingCylinderSets?.length ?? 0) > 0 || (clubCylinderSets?.length ?? 0) > 0` in place of the personal-only check
- [x] 1.2 Update the "no cylinder set" message guard to only show when both `divingCylinderSets` and `clubCylinderSets` are empty

## 2. Blender logbook (BlenderLogbook.tsx)

- [x] 2.1 Update `requiredDataLoaded` to accept `(divingCylinderSets?.length ?? 0) > 0 || (clubCylinderSets?.length ?? 0) > 0` in place of the personal-only check, keeping the existing `storageCylinders`/`gases` requirements unchanged
- [x] 2.2 Update the "no cylinder set" message guard to only show when both `divingCylinderSets` and `clubCylinderSets` are empty

## 3. Verification

- [x] 3.1 Manually verify (or add a test if a suitable harness exists) the three scenarios per view: personal-only, club-only, neither
- [x] 3.2 Run `pnpm run check-types` and `pnpm run lint` for the frontend
