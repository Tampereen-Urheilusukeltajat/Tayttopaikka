## Context

The Happihäkki (blender logbook) form (`apps/frontend/src/components/BlenderLogbook/BlenderLogbook.tsx`) lets blenders pick a gas mixture (`AvailableMixtures`: Nitrox/Trimix/Heliox/Argon, defined in `apps/frontend/src/lib/utils.ts`) and, separately, add rows to fill diving cylinders from the diluent storage bank (`DiluentFillingTile.tsx`). Today the diluent section is only rendered when `gasMixture` is Trimix or Heliox (`isTrimixLike`), with no indication to the user of why the section appears/disappears, and there is no pure-Oxygen mixture option. Feedback from blenders is that Heliox is essentially unused and adds noise, and that the diluent section's implicit visibility rule is confusing.

This is a frontend-only, purely presentational/state-machine change: `AvailableMixtures` and `AvailableMixtureCompositions` are display/state concepts local to this form and have no backend or database representation (see CLAUDE.md's gas types table — Air/Helium/Oxygen/Argon/Diluent are a separate, unrelated concept used for pricing).

## Goals / Non-Goals

**Goals:**

- Reduce the mixture dropdown to NITROX (default), TRIMIX, ARGON, OXYGEN.
- Make the diluent-bank fill section ("Täyttö diluenttipankista") always visible, with its availability gated by a disabled add-button + tooltip instead of disappearing entirely.
- Prevent an inconsistent state where diluent rows exist but the mixture is not TRIMIX, by locking the mixture dropdown once diluent rows are present.
- Auto-fill and lock O2%/He% fields to 100/0 when OXYGEN is selected, consistent with the fixed composition of that mixture.
- Prevent selecting a storage cylinder whose gas content doesn't match the selected mixture in the main "Täyttö" tile.
- Replace the always-shown "Kompressori" dropdown with an explicit filling-method choice, so the compressor field is only shown/relevant when it actually applies.

**Non-Goals:**

- No change to backend gas types, pricing tables, or migrations.
- No change to how diluent price is computed.
- No change to the Diluenttitäyttö row-level fields (storage cylinder selection, pressures) beyond the section-level rename/subheader/add-button gating.
- No persistence of "last selected mixture" or similar UX polish beyond what's specified.
- No new database column for filling method — it is derived from `compressorId` presence, not stored independently.
- No change to the diluent tile's own cylinder list/filtering (already filtered by the Diluent gas) — only the main "Täyttö" tile gains mixture-based filtering.

## Decisions

**1. Drop `Heliox` from `AvailableMixtures`; keep `Argon`, `Trimix`, add `Oxygen`.**
`AvailableMixtureCompositions` currently maps `Heliox` to the same `[oxygen, helium]` components as `Trimix` — the two were functionally identical in the UI (both showed O2%+He% fields, both satisfied `isTrimixLike`). Since diluent availability is being redefined as "TRIMIX only" per the proposal, keeping Heliox would require a decision about whether it also unlocks diluent; removing it (per the feedback) sidesteps that ambiguity entirely. `Oxygen` is added as a new composition entry with a fixed, non-editable 100/0 split — modeled as a new field on `AvailableMixtureCompositions` entries (e.g. `fixedComposition: { oxygenPercentage: 100, heliumPercentage: 0 }`, optional/undefined for the other mixtures) rather than a separate enum, so `BasicInfoTile.tsx` can branch on presence of `fixedComposition` to decide whether the percentage inputs are editable.

**2. Diluent-section visibility vs. availability are now different concerns.**
Previously one boolean (`isTrimixLike`) controlled whether the entire section rendered. Now the section (header, subheader, existing rows, add button) always renders; only the _ability to add a new row_ is gated on `gasMixture === Trimix`. This is a deliberate UX simplification requested in the feedback — visibility of the section itself is no longer meaningful, since a mixture lock (Decision 3) means diluent rows can only exist when the mixture is TRIMIX anyway.

**3. Lock the gas mixture dropdown once `diluentFillingRows.length > 0`, not via a separate "confirmed" flag.**
The dropdown's `disabled` prop already checks `values.userConfirm`. This adds an OR condition: `disabled={values.userConfirm || values.diluentFillingRows.length > 0}`. This is simpler than introducing new form state and directly encodes the invariant the proposal asks for ("if diluent is added, lock gas mixture selection"). The reverse direction — preventing the _add_ button from being enabled unless mixture is TRIMIX — is a separate, independent check (`values.gasMixture !== AvailableMixtures.Trimix`), so the two rules together make "diluent rows exist" ⟺ "mixture is TRIMIX and locked" a stable invariant with no way to reach a contradictory state through the UI.

**4. Tooltip on disabled buttons: extend `PrimaryButton`, don't fork a new component.**
`ElementButton` (`Buttons.tsx`) already implements the hover-tooltip pattern (`react-tooltip`, `data-tooltip-id`/`data-tooltip-content`, random `tooltipId`). `PrimaryButton` is a thin wrapper without this. Rather than inlining `OverlayTrigger`/`Popover` (the other tooltip pattern in the codebase, used only for the click-to-open info popover) around the add button, we add the same optional `tooltip` prop to `PrimaryButton`, reusing existing styling/behavior so both button types are consistent. The gas-mixture `DropdownMenu` needs a similar hover tooltip when disabled-by-diluent-rows; since `DropdownMenu` (`common/Inputs.tsx`) has no tooltip support today, wrap it the same way (optional `tooltip` prop threaded through to a `Tooltip` + `data-tooltip-*` attrs) for consistency with the button change, rather than introducing a bespoke wrapper component just for this dropdown.

**5. Default mixture value: NITROX.**
`FillingEventBasicInfo`'s initial value for `gasMixture` changes from whatever it is today to `AvailableMixtures.Nitrox` explicitly, per the "selected by default" requirement.

**6. Storage cylinder filtering: mixture → allowed gas name(s), same pattern as the existing diluent filter.**
`BlenderLogbook.tsx` already derives `diluentCylinders`/`regularStorageCylinders` by filtering `storageCylinders` against a `gasId` looked up from `gases` by `AvailableGasses.diluent`. We extend this with a `gasId` lookup by name (`AvailableGasses.oxygen`, `.argon`, `.helium`) and a small mixture → allowed-gas-names map colocated with `AvailableMixtureCompositions` in `utils.ts` (e.g. `{ Nitrox: [oxygen], Oxygen: [oxygen], Argon: [argon], Trimix: [oxygen, helium] }`). `FillingTile.tsx` receives the already-filtered list (filtering happens once in `BlenderLogbook.tsx`, consistent with how `regularStorageCylinders`/`diluentCylinders` are computed today) rather than filtering inline in the tile. No schema change: every `storage_cylinder` row already has exactly one `gas_id`.

Existing rows already selected in `fillingEventRows` that reference a cylinder outside the new filter (e.g. blender picked an Argon cylinder, then switched mixture to Nitrox) are **not** auto-cleared by this change — see Risks below.

**7. Filling method (Osapainetäyttö / Jatkuvan virtauksen täyttö) is derived UI state, not a new form field or DB column.**
`fill_event.compressor_id` is already nullable end-to-end (API schema, backend insert, frontend types) and validation.ts doesn't require it. Rather than adding a `fillingMethod` field to `FormFields`, `BasicInfoTile.tsx` introduces a local radio/segmented control (not itself a submitted field) that toggles which of two states the form is in:

- **Osapainetäyttö**: compressor dropdown hidden, `compressorId` forced to `''` (submitted as `null`, matching today's "Ei kompressoria (tyhjä)" option).
- **Jatkuvan virtauksen täyttö**: compressor dropdown shown, matching today's existing dropdown behavior (list of non-air-only compressors, `userConfirm` disables it).

This keeps the change frontend-only and avoids a migration; if the developer later wants to report on filling method independent of compressor presence (e.g. distinguishing "continuous flow, no compressor picked" from "partial pressure"), that would need a follow-up change to add a real column — flagged as an open question below.

The default on form load is **Osapainetäyttö** (compressor hidden, `compressorId` empty) rather than today's default of pre-selecting `compressors[0].id`, since partial-pressure filling doesn't involve a compressor at all and is the simpler, more common case this change is meant to surface. This changes `views/BlenderLogbook.tsx`'s `requiredDataLoaded` check, which today requires at least one non-air-only compressor to exist before the form renders — that gate must be dropped (or scoped only to the compressor dropdown's own rendering) since a compressor is no longer mandatory to use the form at all.

## Risks / Trade-offs

- [Existing diluent rows created under Heliox in already-submitted (but not yet finalized/local-draft) form state] → N/A: `gasMixture` is transient form state, not persisted between sessions, and submitted fill events already store diluent data independently keyed to storage cylinders, not to the mixture enum. No migration needed since nothing is stored server-side keyed by `AvailableMixtures`.
- [Locking the mixture dropdown after adding a diluent row could feel restrictive if a blender adds a row by mistake] → Mitigation: the blender can still remove the diluent row (existing remove-row affordance in `DiluentFillingTile`) to unlock the dropdown again; this is consistent with the proposal's explicit ask and the tooltip explains why it's locked.
- [`PrimaryButton` tooltip prop addition could affect other call sites] → Mitigation: prop is optional and defaults to no tooltip, so existing usages are unaffected.
- [A blender picks storage cylinders in the "Täyttö" tile, then switches the gas mixture to one that no longer permits those cylinders] → Mitigation: same handling as the existing diluent-vs-mixture edge case — the already-selected `fillingEventRows` values are not silently cleared by this change (out of scope per the design decision above); the developer should confirm during implementation whether this needs an explicit reset, consistent with how `diluentFillingRows` already behaves today when mixture changes.
- [Removing the default compressor pre-selection changes existing behavior for blenders used to a compressor always being chosen] → Mitigation: this is the explicit, requested behavior change (filling method now defaults to Osapainetäyttö); call it out clearly in the PR description as a **BREAKING** behavioral change per CLAUDE.md guidance.
- [`views/BlenderLogbook.tsx`'s `requiredDataLoaded` gate on having a non-air-only compressor no longer makes sense once compressor becomes optional] → Mitigation: relax this check as part of implementation; a club with no configured continuous-flow compressor should still be able to use partial-pressure filling.

## Open Questions

- Should "filling method" ever need to be queried/reported on independently of whether a compressor was actually selected (e.g. an admin wants to see "how many fills were continuous-flow this month")? If so, a follow-up change should add a real `filling_method` column instead of inferring it from `compressor_id`. Out of scope for this change per the developer's direction to infer rather than persist.

## Post-Implementation Updates

The following refinements were made during in-browser review, after the initial implementation of Decision 7 above:

- **No compressor picker at all.** There is only one non-air-only compressor configured today, so `BasicInfoTile.tsx` auto-assigns `compressors[0]?.id` whenever "Jatkuvan virtauksen täyttö" is selected, instead of showing a dropdown of compressors. A `TODO` comment marks this for revisiting if a club ever configures more than one continuous-flow compressor.
- **Default filling method flipped to "Jatkuvan virtauksen täyttö".** Contrary to the original Decision 7, continuous-flow (with its auto-assigned compressor) is now the default on form load, not Osapainetäyttö.
- **Argon forces Osapainetäyttö.** Selecting ARGON as the gas mixture disables the "Jatkuvan virtauksen täyttö" option and forces the effective filling method to Osapainetäyttö (computed at render time, not via a `setState`-in-`useEffect`, to satisfy the `react-hooks/set-state-in-effect` lint rule). Switching away from ARGON restores whatever filling method the blender had chosen before.
- **Argon also resets O2%/He% to 0.** Mirrors the OXYGEN `fixedComposition` mechanism from Decision 1 — Argon's `AvailableMixtureCompositions` entry now also carries `fixedComposition: { oxygenPercentage: '0', heliumPercentage: '0' }`, so the existing effect/disabled-field logic handles the reset with no new code path.
- **OXYGEN dropdown label is "Happi", not "Oxygen".** A `mapMixtureToLabel` helper in `utils.ts` maps the OXYGEN enum value to the Finnish label for display; Nitrox/Trimix/Argon keep their standard diving terminology.
- **No default filling row.** The main filling tile (renamed "Täyttö varastopulloista", add button renamed "Lisää uusi varastopullo") no longer pre-populates one row on form load — the blender must add rows explicitly. This also simplified `filledAir` detection in `handleFormSubmit`, which already keyed off `fillingEventRows.length === 0`.
- **Täyttötapa radio order.** "Jatkuvan virtauksen täyttö" is listed above "Osapainetäyttö", under a "Täyttötapa" label, matching the new default.

## Migration Plan

Frontend-only change, no backend deploy coordination needed. Ship as a normal PR to `main`; no feature flag required since this only affects the Happihäkki form's client-side behavior and has no data migration.
