## ADDED Requirements

### Requirement: Available gas mixtures

The Happihäkki (blender logbook) gas mixture dropdown SHALL offer exactly four options: NITROX, TRIMIX, ARGON, and OXYGEN. NITROX SHALL be selected by default when the form is opened. Heliox SHALL NOT appear as an option. The OXYGEN option SHALL be displayed with the Finnish label "Happi"; the other options SHALL be displayed using their standard diving terminology (Nitrox, Trimix, Argon).

#### Scenario: Dropdown options

- **WHEN** a blender opens the gas mixture dropdown on the Happihäkki form
- **THEN** the only options shown are NITROX, TRIMIX, ARGON, and OXYGEN (labeled "Happi"), in that order, with no Heliox option

#### Scenario: Default selection

- **WHEN** a blender opens a new fill event form
- **THEN** the gas mixture field is pre-selected to NITROX

### Requirement: Oxygen mixture auto-fills and locks percentages

When OXYGEN is the selected gas mixture, the oxygen percentage field SHALL be set to 100 and the helium percentage field SHALL be set to 0, and both fields SHALL be disabled (not editable) while OXYGEN remains selected.

#### Scenario: Selecting Oxygen

- **WHEN** a blender selects OXYGEN as the gas mixture
- **THEN** the oxygen percentage field shows 100 and the helium percentage field shows 0, and both fields become disabled

#### Scenario: Switching away from Oxygen

- **WHEN** a blender changes the gas mixture away from OXYGEN to another unlocked mixture
- **THEN** the oxygen and helium percentage fields become editable again

### Requirement: Argon mixture resets and locks percentages

When ARGON is the selected gas mixture, the oxygen percentage field and the helium percentage field SHALL both be set to 0 and SHALL be disabled (not editable) while ARGON remains selected.

#### Scenario: Selecting Argon

- **WHEN** a blender selects ARGON as the gas mixture
- **THEN** the oxygen percentage field and the helium percentage field both show 0, and both fields become disabled

#### Scenario: Switching away from Argon

- **WHEN** a blender changes the gas mixture away from ARGON to another unlocked mixture
- **THEN** the oxygen and helium percentage fields become editable again

### Requirement: Diluent-bank fill section is always visible

The "Täyttö diluenttipankista" section SHALL always render on the Happihäkki form, regardless of the currently selected gas mixture. Its header SHALL read "Täyttö diluenttipankista" (renamed from "Diluenttitäyttö") and SHALL be followed by a subheader reading "Lisää täytöt diluenttipankista tätä kautta. Lisää tietoa info-ikonia klikkaamalla."

#### Scenario: Section visible for any mixture

- **WHEN** a blender selects NITROX, TRIMIX, ARGON, or OXYGEN as the gas mixture
- **THEN** the "Täyttö diluenttipankista" section, including its header and subheader, is rendered on the form

### Requirement: Diluent row can only be added when Trimix is selected

The "Lisää diluenttitäyttö" add button in the diluent-bank fill section SHALL be disabled unless the currently selected gas mixture is TRIMIX. While disabled for this reason, the button SHALL show a tooltip reading "Valitse TRIMIX täyttääksesi diluenttipankista".

#### Scenario: Add button disabled for non-Trimix mixture

- **WHEN** the selected gas mixture is NITROX, ARGON, or OXYGEN
- **THEN** the "Lisää diluenttitäyttö" add button is disabled and hovering it shows the tooltip "Valitse TRIMIX täyttääksesi diluenttipankista"

#### Scenario: Add button enabled for Trimix

- **WHEN** the selected gas mixture is TRIMIX and there is at least one diluent storage cylinder not yet used by an existing row
- **THEN** the "Lisää diluenttitäyttö" add button is enabled

### Requirement: Storage cylinders are filtered by selected gas mixture in the main filling tile

In the main "Täyttö varastopulloista" tile, the storage cylinder dropdown SHALL only offer cylinders whose gas content matches the currently selected gas mixture: NITROX and OXYGEN SHALL show only Oxygen-content cylinders, ARGON SHALL show only Argon-content cylinders, and TRIMIX SHALL show Oxygen- and Helium-content cylinders. This filtering SHALL NOT apply to the diluent-bank fill section's own cylinder list.

#### Scenario: Nitrox or Oxygen mixture filters to Oxygen cylinders

- **WHEN** the selected gas mixture is NITROX or OXYGEN
- **THEN** the storage cylinder dropdown in the "Täyttö varastopulloista" tile lists only cylinders whose gas content is Oxygen

#### Scenario: Argon mixture filters to Argon cylinders

- **WHEN** the selected gas mixture is ARGON
- **THEN** the storage cylinder dropdown in the "Täyttö varastopulloista" tile lists only cylinders whose gas content is Argon

#### Scenario: Trimix mixture filters to Oxygen and Helium cylinders

- **WHEN** the selected gas mixture is TRIMIX
- **THEN** the storage cylinder dropdown in the "Täyttö varastopulloista" tile lists cylinders whose gas content is Oxygen or Helium

### Requirement: Gas mixture is locked once a diluent row exists

Once at least one diluent fill row has been added to the form, the gas mixture dropdown SHALL be disabled and SHALL NOT be changeable to NITROX, ARGON, or OXYGEN. While disabled for this reason, the dropdown SHALL show a tooltip reading "Diluenttitäyttö lisätty, kaasuseos on aina TRIMIX".

#### Scenario: Mixture locked after adding diluent row

- **WHEN** a blender adds a diluent fill row while TRIMIX is selected
- **THEN** the gas mixture dropdown becomes disabled and hovering it shows the tooltip "Diluenttitäyttö lisätty, kaasuseos on aina TRIMIX"

#### Scenario: Mixture unlocked after removing all diluent rows

- **WHEN** a blender removes all diluent fill rows from the form
- **THEN** the gas mixture dropdown becomes enabled again and can be changed to any of the four mixtures
