# Spec: Blender Logbook Filling Method

## Purpose

The Happihäkki (blender logbook) form lets blenders choose a filling method — continuous-flow or partial-pressure — instead of picking a compressor directly. The compressor is auto-assigned when continuous-flow filling is used, and no compressor is associated for partial-pressure fills.

---

## Requirements

### Requirement: Filling method choice replaces the always-shown compressor dropdown

The Happihäkki (blender logbook) form SHALL offer a filling method choice, labeled "Täyttötapa", between "Jatkuvan virtauksen täyttö" and "Osapainetäyttö". "Jatkuvan virtauksen täyttö" SHALL be the default filling method when the form is opened. The compressor is never shown as a user-facing dropdown; when "Jatkuvan virtauksen täyttö" is selected, the single configured non-air-only compressor SHALL be auto-assigned without asking the user to pick one.

#### Scenario: Default filling method on load
- **WHEN** a blender opens a new fill event form
- **THEN** "Jatkuvan virtauksen täyttö" is selected as the filling method and the club's single non-air-only compressor is auto-assigned

#### Scenario: Selecting continuous-flow filling auto-assigns the compressor
- **WHEN** a blender selects "Jatkuvan virtauksen täyttö" as the filling method
- **THEN** the club's single non-air-only compressor is associated with the fill event, with no compressor picker shown

#### Scenario: Selecting partial-pressure filling clears the compressor
- **WHEN** a blender selects "Osapainetäyttö" as the filling method
- **THEN** no compressor is associated with the fill event

---

### Requirement: Argon fills are always partial-pressure

When the selected gas mixture is ARGON, the filling method SHALL be forced to "Osapainetäyttö" and the "Jatkuvan virtauksen täyttö" option SHALL be disabled.

#### Scenario: Selecting Argon forces partial-pressure filling
- **WHEN** a blender selects ARGON as the gas mixture while "Jatkuvan virtauksen täyttö" is selected
- **THEN** the filling method switches to "Osapainetäyttö" and the "Jatkuvan virtauksen täyttö" option becomes disabled

#### Scenario: Switching away from Argon restores the filling method choice
- **WHEN** a blender changes the gas mixture away from ARGON to another mixture
- **THEN** the "Jatkuvan virtauksen täyttö" option becomes selectable again, restoring the blender's last chosen filling method

---

### Requirement: Filling method is derived from compressor selection, not persisted separately

The system SHALL NOT introduce a new stored field for filling method. Whether a fill event is a continuous-flow or partial-pressure fill SHALL be inferred solely from whether a compressor was selected (`compressorId` set vs. null) at submission time.

#### Scenario: Submitting a partial-pressure fill
- **WHEN** a blender submits a fill event while "Osapainetäyttö" is selected
- **THEN** the fill event is created with no compressor associated (`compressorId` is null)

#### Scenario: Submitting a continuous-flow fill
- **WHEN** a blender submits a fill event while "Jatkuvan virtauksen täyttö" is selected
- **THEN** the fill event is created with the auto-assigned compressor's id associated

---

### Requirement: Happihäkki form does not require a configured compressor to be usable

The Happihäkki form SHALL be usable for partial-pressure filling even when no non-air-only compressor is configured for the club.

#### Scenario: No compressors configured
- **WHEN** a club has no non-air-only compressors configured
- **THEN** the Happihäkki form still renders and allows submitting a partial-pressure fill event
