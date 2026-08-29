## 1. Gas mixture options

- [x] 1.1 In `apps/frontend/src/lib/utils.ts`, remove `Heliox` from `AvailableMixtures` and add `Oxygen`.
- [x] 1.2 Update `AvailableMixtureCompositions` in the same file: remove the Heliox entry, add an Oxygen entry with a fixed composition marker (e.g. `fixedComposition: { oxygenPercentage: 100, heliumPercentage: 0 }`), keep Nitrox/Trimix/Argon entries as-is (add the same optional `fixedComposition` field, undefined, to their shape for type consistency).
- [x] 1.3 Update `formalizeGasMixture` (same file) to handle the Oxygen mixture (e.g. render as `"O2 100%"` or similar — confirm exact display string with the developer if not obvious from existing patterns) and remove any Heliox-specific branch.
- [x] 1.4 Set the default value of `gasMixture` in `FillingEventBasicInfo`'s initial form values (`apps/frontend/src/components/BlenderLogbook/BlenderLogbook.tsx`) to `AvailableMixtures.Nitrox`.

## 2. Oxygen auto-fill and lock

- [x] 2.1 In `BasicInfoTile.tsx`, when `values.gasMixture === AvailableMixtures.Oxygen`, set `oxygenPercentage` to `'100'` and `heliumPercentage` to `'0'` (e.g. via a `useEffect`/`setFieldValue` on mixture change, consistent with existing Formik patterns in this file).
- [x] 2.2 Disable the oxygen % and helium % `TextInput`s whenever the selected mixture has a `fixedComposition` (i.e. Oxygen), replacing/extending the current disabled-by-component-presence check.
- [x] 2.3 Verify switching away from Oxygen to another unlocked mixture re-enables the percentage fields and does not leave stale locked values behind.

## 3. Diluent section rename and always-visible

- [x] 3.1 In `DiluentFillingTile.tsx`, remove the `isTrimixLike` check (and the early `return null` gated on it) so the section always renders.
- [x] 3.2 Rename the section header from "Diluenttitäyttö" to "Täyttö diluenttipankista".
- [x] 3.3 Add a subheader below the title reading "Lisää täytöt diluenttipankista tätä kautta. Lisää tietoa info-ikonia klikkaamalla.", styled consistently with the existing header/info-icon row.
- [x] 3.4 Confirm the section still hides/handles gracefully the case where there are zero diluent storage cylinders configured (existing `diluentCylinders.length === 0` check) — decide whether this still short-circuits the whole section or only the add button, per design intent that the section is "always visible". **Resolution:** removed the standalone zero-cylinders early return; it now folds into the add button's "no free cylinder" disable condition (`diluentFillingRows.length < diluentCylinders.length`), so the section itself always renders.

## 4. Diluent add button gating

- [x] 4.1 Add a `PrimaryButton` tooltip prop (`apps/frontend/src/components/common/Button/Buttons.tsx`), mirroring `ElementButton`'s existing `tooltip`/`data-tooltip-id`/`data-tooltip-content`/`react-tooltip` pattern.
- [x] 4.2 In `DiluentFillingTile.tsx`, always render the "Lisää diluenttitäyttö" add button (remove the `values.diluentFillingRows.length < diluentCylinders.length` visibility gate if it currently hides the button entirely; keep it disabled instead when there's no room).
- [x] 4.3 Disable the add button when `values.gasMixture !== AvailableMixtures.Trimix`, with tooltip text "Valitse TRIMIX täyttääksesi diluenttipankista".
- [x] 4.4 Ensure existing disable conditions (`values.userConfirm`, no free diluent cylinders) still apply and combine correctly with the new Trimix-only condition (e.g. don't show the Trimix tooltip when the real blocking reason is "no free cylinders" — confirm precedence with the developer, defaulting to Trimix-check first since it's the primary gate per the proposal). **Resolution:** implemented as described — Trimix tooltip shown whenever mixture isn't TRIMIX, no tooltip for the "no free cylinders" case.

## 5. Gas mixture dropdown lock

- [x] 5.1 Add tooltip support to `DropdownMenu` (`apps/frontend/src/components/common/Inputs.tsx`), reusing the same `react-tooltip` pattern as the `PrimaryButton` change in 4.1.
- [x] 5.2 In `BasicInfoTile.tsx`, update the gas mixture `DropdownMenu`'s `disabled` prop to `values.userConfirm || values.diluentFillingRows.length > 0`.
- [x] 5.3 When disabled specifically because `diluentFillingRows.length > 0`, show tooltip "Diluenttitäyttö lisätty, kaasuseos on aina TRIMIX" (no tooltip needed for the pre-existing `userConfirm` lock, unless one already exists — check current behavior).
- [x] 5.4 Verify removing all diluent rows re-enables the dropdown.

## 6. Types and validation

- [x] 6.1 Update `FillingEventBasicInfo`/`FormFields` types (`BlenderLogbook.tsx`) if any new fields are introduced (e.g. none expected — `gasMixture` type stays `AvailableMixtures`, just with new enum values). **Resolution:** no new fields needed; filling method is local component state in `BasicInfoTile.tsx`, not a form field.
- [x] 6.2 Review `apps/frontend/src/components/BlenderLogbook/validation.ts` — confirm the Yup schema for `gasMixture` doesn't hardcode old enum values; add enum validation if it was previously implicit. **Resolution:** schema uses `yup.string().required()` with no hardcoded enum values; no change needed.

## 7. Storage cylinder filtering by mixture

- [x] 7.1 In `apps/frontend/src/lib/utils.ts`, add a mixture → allowed gas name(s) map alongside `AvailableMixtureCompositions` (Nitrox/Oxygen → Oxygen; Argon → Argon; Trimix → Oxygen + Helium).
- [x] 7.2 In `BlenderLogbook.tsx`, extend the existing `diluentGasId`/`regularStorageCylinders` derivation pattern (lines ~164-166) to also filter `regularStorageCylinders` passed to `FillingTile` down to cylinders whose `gasId` matches the currently selected mixture's allowed gas name(s).
- [x] 7.3 In `FillingTile.tsx`, verify the cylinder dropdown now only lists the filtered set (no change needed in the tile itself if filtering happens upstream, per design.md decision 6). **Resolution:** confirmed no change needed to `FillingTile.tsx` itself.
- [x] 7.4 Decide (confirm with developer during implementation if unclear) whether `fillingEventRows` referencing a now-filtered-out cylinder should be cleared when the mixture changes, or left as-is per design.md's noted risk. **Resolution:** left as-is, per design.md's explicit call — not auto-cleared.

## 8. Filling method (Osapainetäyttö / Jatkuvan virtauksen täyttö)

- [x] 8.1 In `BasicInfoTile.tsx`, add a filling-method control (e.g. radio/segmented buttons) with two options: "Osapainetäyttö" and "Jatkuvan virtauksen täyttö", not itself a submitted form field.
- [x] 8.2 Default the filling method to "Osapainetäyttö" on form load; when active, hide the "Kompressori" dropdown entirely and ensure `compressorId` is `''`/null.
- [x] 8.3 When "Jatkuvan virtauksen täyttö" is selected, show the existing "Kompressori" dropdown (list of non-air-only compressors) exactly as it behaves today.
- [x] 8.4 Update `BlenderLogbook.tsx`'s initial `compressorId` value — no longer default to `compressors[0].id`; default to `''` since the initial filling method is Osapainetäyttö.
- [x] 8.5 In `apps/frontend/src/views/BlenderLogbook.tsx`, relax `requiredDataLoaded` so the form still renders when there are zero non-air-only compressors (a club without a continuous-flow compressor can still do partial-pressure fills).
- [x] 8.6 Verify submission: partial-pressure fill submits with `compressorId` null/omitted; continuous-flow fill submits with the selected compressor's id, matching existing backend behavior (no backend changes expected, `compressorId` is already optional end-to-end).

## 9. Verification

- [x] 9.1 Run `pnpm run check-types` and `pnpm run lint` for the frontend.
- [x] 9.2 Manually exercise the Happihäkki form: default NITROX selection, switching to each mixture, Oxygen auto-fill/lock, adding/removing diluent rows and confirming the dropdown lock/unlock and tooltip text, and the add-button disabled tooltip when mixture isn't TRIMIX. **Resolution:** verified by the developer in-browser; confirmed working.
- [x] 9.3 Manually verify storage cylinder filtering: switch between NITROX/OXYGEN/ARGON/TRIMIX and confirm only the expected cylinders are selectable in the "Täyttö" tile each time. **Resolution:** verified by the developer in-browser; confirmed working.
- [x] 9.4 Manually verify filling method: default is now Jatkuvan virtauksen täyttö with the single compressor auto-assigned (no dropdown shown), Osapainetäyttö clears the compressor, Argon forces Osapainetäyttö, and submission behavior matches for both paths. **Resolution:** verified by the developer in-browser; confirmed working. Note: default filling method and compressor-dropdown behavior evolved during implementation (auto-assign single compressor instead of a picker; default flipped to continuous-flow) per follow-up developer feedback — see design.md decisions for the final behavior.
- [x] 9.5 Confirm no regressions in existing BlenderLogbook-related frontend tests (if any exist) and add/update tests covering the new mixture options, cylinder filtering, filling method, and locking behavior if the project has frontend test coverage for this form. **Note:** no frontend test suite exists in this repo (`apps/frontend/src` has zero `*.test.*` files), so there's nothing to regress or extend here.
