## Why

Blenders using the Happihäkki view (`/blender-logbook`) found several parts of the form confusing: Heliox is rarely used and clutters the gas mixture dropdown, the diluent fill section disappears/reappears based on an implicit "is trimix-like" check with no explanation, there's no pure-Oxygen option even though blenders sometimes fill straight O₂, the main filling tile lists every storage cylinder regardless of the selected mixture (so a blender can accidentally pick an Argon cylinder while filling Nitrox), and the "Kompressori" dropdown doesn't communicate that it only matters for continuous-flow/membrane blending. This change simplifies the gas mixture options, makes the diluent fill section's availability rules explicit and discoverable, filters storage cylinders by mixture to prevent mis-selection, and replaces the compressor dropdown with an explicit filling-method choice.

## What Changes

- **Remove Heliox** from the gas mixture dropdown (`AvailableMixtures`). Remaining options: **NITROX** (selected by default), **TRIMIX**, **ARGON**.
- **Add OXYGEN** as a new gas mixture option. When selected, Oxygen % is auto-filled to 100 and Helium % to 0, and both percentage fields are locked (not editable).
- **Always render** the "Täyttö diluenttipankista" (renamed from "Diluenttitäyttö") section — drop the `isTrimixLike` visibility check that currently hides/shows it based on gas mixture. **BREAKING** (behavioral): the section is now always visible instead of conditionally appearing.
- **Disable the "Lisää diluenttitäyttö" add button** unless TRIMIX is the selected gas mixture, with a tooltip on the disabled button: "Valitse TRIMIX täyttääksesi diluenttipankista".
- **Lock the gas mixture dropdown** once at least one diluent fill row has been added, so it cannot be changed away from TRIMIX to ARGON/NITROX/OXYGEN. Disabled dropdown gets a tooltip: "Diluenttitäyttö lisätty, kaasuseos on aina TRIMIX".
- **Rename** the section header "Diluenttitäyttö" → "Täyttö diluenttipankista".
- **Add a subheader** under the new section title: "Lisää täytöt diluenttipankista tätä kautta. Lisää tietoa info-ikonia klikkaamalla."
- Extend `PrimaryButton` (or wrap it) so it can show a tooltip while disabled, mirroring the existing `tooltip` prop already supported by `ElementButton`.
- **Filter storage cylinders in the main "Täyttö" tile by the selected gas mixture**: NITROX and OXYGEN show only Oxygen-content cylinders, ARGON shows only Argon-content cylinders, TRIMIX shows Oxygen- and Helium-content cylinders. Today every storage cylinder is listed regardless of mixture. **BREAKING** (behavioral): cylinders that don't match the selected mixture's gas(es) are no longer selectable in this tile.
- **Replace the "Kompressori" concept with an explicit filling method choice**: "Osapainetäyttö" (partial pressure filling, no compressor) and "Jatkuvan virtauksen täyttö" (continuous-flow/membrane filling, requires selecting a compressor). The compressor dropdown/value is only relevant for, and only shown during, continuous-flow filling; filling method is derived from whether `compressorId` is set, not stored as its own field. **BREAKING** (behavioral): the compressor dropdown is no longer always shown/defaulted; it now appears only when continuous-flow filling is selected.

## Capabilities

### New Capabilities

- `blender-logbook-gas-mixture`: Gas mixture selection (NITROX/TRIMIX/ARGON/OXYGEN), storage cylinder filtering by mixture, and the interaction with the diluent-bank fill section in the Happihäkki (blender logbook) form — available mixtures, auto-fill/locking behavior for OXYGEN, cylinder filtering rules, and the availability/locking rules between gas mixture and diluent fill rows.
- `blender-logbook-filling-method`: The filling method choice (Osapainetäyttö / Jatkuvan virtauksen täyttö) in the Happihäkki form and its relationship to compressor selection.

### Modified Capabilities

- (none — no existing spec covers this area yet)

## Impact

- Frontend only, no backend/API/migration changes — every field this change relies on (`storage_cylinder.gas_id`, `fill_event.compressor_id`) already exists and is already nullable/queryable as needed.
- `apps/frontend/src/lib/utils.ts`: `AvailableMixtures` enum and `AvailableMixtureCompositions` — remove Heliox, add Oxygen; add a mixture → allowed gas name(s) mapping for cylinder filtering.
- `apps/frontend/src/components/BlenderLogbook/components/BasicInfoTile.tsx`: gas mixture dropdown — default value, OXYGEN auto-fill/lock behavior for percentage fields, lock dropdown when diluent rows exist, disabled tooltip; replace the always-shown "Kompressori" `DropdownMenu` with a filling-method choice that conditionally reveals the compressor dropdown.
- `apps/frontend/src/components/BlenderLogbook/components/DiluentFillingTile.tsx`: remove `isTrimixLike` gating, rename header, add subheader text, disable/tooltip on the add button based on selected mixture.
- `apps/frontend/src/components/BlenderLogbook/components/FillingTile.tsx`: filter the storage cylinder dropdown options by the selected gas mixture instead of listing all `regularStorageCylinders`.
- `apps/frontend/src/components/BlenderLogbook/BlenderLogbook.tsx`: `FormFields`/`FillingEventBasicInfo` types and default form values (default mixture becomes NITROX; default filling method and `compressorId` initial value; verify diluent row handling when mixture is not TRIMIX).
- `apps/frontend/src/components/common/Button/Buttons.tsx`: extend `PrimaryButton` with an optional `tooltip` prop (or equivalent wrapper) to support the disabled-state tooltip.
- `apps/frontend/src/views/BlenderLogbook.tsx`: `requiredDataLoaded` currently requires at least one non-air-only compressor to exist before rendering the form at all — this must be relaxed since compressor selection becomes conditional on filling method.
- Does not touch migrations or pricing logic — `AvailableMixtures` is a purely frontend display/state concept; backend gas pricing (`AvailableGasses`) and the `compressor`/`storage_cylinder` schemas are untouched.

## Non-goals

- No changes to backend gas types, pricing calculation, or the `gas`/`gas_price` tables.
- No changes to how diluent price is computed (`packages/pricing` / `docs/pricing.md`) — only which mixtures may add diluent rows.
- No changes to `isAdvancedBlender`/`isBlender` role permissions.
- No changes to non-Happihäkki views (e.g. admin logbook views, invoicing).
- No new database column for "filling method" — it is derived from whether `compressorId` is set, not persisted as its own field (see design.md).
- No change to the `compressor`/`fill_event.compressor_id` or `storage_cylinder.gas_id` schema — both already support this change as-is.
- No change to the diluent tile's own cylinder list (`diluentCylinders`, filtered by the Diluent gas) — only the main "Täyttö" tile's filtering is new.
